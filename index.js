require('dotenv').config();
const db = require('./database');
const utility = require('./utility');
const { Client } = require('discord.js-selfbot-v13');
const MsgArray = require('./MsgArray');

const client = new Client();
const messages = new MsgArray(5);

let char_wishlist = [];
let series_wishlist = [];

let timer = null;
let channel;

//function for rolling
async function Roll () {
  let collected;    
  let message;  
  let roll_count = 0;
  let filter = m => m.author.username.includes('Mudae');
  while(roll_count < 20){
    try{
      roll_count++;
      await utility.sleep(process.env.SLEEP_BETWEEN_ROLLS);
      message = await channel.send('$m');
      collected = await channel.awaitMessages({filter, max: 1, time: process.env.ROLL_TIMEOUT, errors:['time']});
      const roll = collected.first();
      
      if (roll.content.includes(`**${client.user.username}**, the roulette is limited to`)){ //end rolling when reached the limit
        console.log('Rolling ended gracefully');
        break;
      }

      
      console.log('Rolled');

    } catch (error){
      console.log('ERROR rolling : ' + error);
    }
  }
};

//runs when the bot is started
client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);  

  channel = await client.channels.fetch(process.env.CHANNEL_ID);  //roll channel

  try{
    char_wishlist = await db('wishlist').select('name').where('type', 'character');  //loading wishlist from db
    series_wishlist = await db('wishlist').select('name').where('type', 'series');
  } catch(error){
    console.log('ERROR while loading wishlist');
  }    

  if (process.env.ROLL == 1){ //can be disabled in the .env file
    Roll(); //initial roll
    timer = setInterval(Roll, process.env.ROLL_TIMER); //adding a timer
  }

})

//auto claim
client.on('messageCreate', async (m) => {

  if (m.channel.id != channel.id){ //ignoring non roll channels
    return;
  }

  messages.add(m);  //adding messages to an array to find whom the rolls belong to

  if (m.author.username == 'Mudae' && m.embeds.length > 0){
    try{
      const roll = m.embeds[0];

      if (!roll.description.includes('React with any emoji to claim')){ //avoiding non roll messages with embeds
        return;
      }

      const roller = messages.getButAvoid('Mudae')[0].author; //the owner of the roll
      const char_name = roll.author.name;
      const char_desc = roll.description.replace(/\nReact with any emoji to claim!/g, '');      

      //inserting rolls into the database
      if (process.env.RECORD_ROLLS==1){ //can be disabled with .env file
        try{
          await db('rolls').insert({
            name: char_name,
            series: char_desc,
            rolled_by: roller.username
          });
          console.log('Successfully inserted roll data into database');
        } catch (error){
          console.log('ERROR while inserting roll data into database\n'+error);
        }
      }
      

      if(char_wishlist.some( wish => char_name.includes(wish.name)) || series_wishlist.some(wish=>char_desc.includes(wish.name))){
        m.react('👍');
      }      


    } catch (error){
      console.log('ERROR claiming : ' + error);
      return;
    }
    

  }  
})

//wishlist related
client.on('messageCreate', async (m) => {
  if (m.channel.id != channel.id){ //ignoring non roll channels
    return;
  }

  if ((m.content == `wish character` || m.content == 'wish series') && m.reference){  
    const char = await m.channel.messages.fetch(m.reference.messageId);

    if (char.embeds.length <= 0){
      m.reply('Not a valid character');
      return;
    } 
    
    const roll = char.embeds[0]; //retrieving character details from the embed

    if(!roll.description.includes('Claim Rank')){
      m.reply('Not a valid character');
      return;
    }

    
    const name = roll.author.name;
    const series = roll.description.split('<:')[0].trim();


    if (m.content == 'wish character'){
      try{
        await db('wishlist').insert({name: name, type: 'character'});
        console.log(`Successfully inserted ${name} into wishlist`);
        char_wishlist = await db('wishlist').select('name').where('type', 'character'); //updating the wishlist in memory
      } catch (error){
        console.log(`ERROR while inserting ${name} to wishlist\n`+error);
      }
      

    } else if (m.content == 'wish series'){
      try{
        await db('wishlist').insert({name: series, type: 'series'});
        console.log(`Successfully inserted ${series} into wishlist`);
        series_wishlist = await db('wishlist').select('name').where('type', 'series'); //updating the wishlist in memory
      } catch (error){
        console.log(`ERROR while inserting ${series} to wishlist\n`+error);
      }
    }    
  }
})

//bot commands
client.on('messageCreate', async(m)=>{
  if (m.content == 'enable rolling'){ //enable rolling
    let obj = {ROLL:1}
    if (await utility.change_setting(obj)){      
      if (timer != null){
        m.react('☑️');
        return;
      } else {
        Roll();
        timer = setInterval(Roll, process.env.ROLL_TIMER);
        m.react('✅');
      }
    } else {
      m.reply('Rolling could not be enabled');
    }
  } else if (m.content == 'disable rolling'){ //disable rolling
    let obj = {ROLL:0}
    if (await utility.change_setting(obj)){      
      if (timer == null){
        m.react('☑️');
        return;
      } else {
        try{
          clearInterval(timer);
          timer = null;
          m.react('✅');
          return;
        } catch (error){
          console.log('ERROR while clearing timer : ' + error);
        }        
      }
    } else {
      m.reply('Rolling could not be disabled');
    }
  } 

})

client.login(process.env.CLIENT_TOKEN);