const fs = require('fs').promises;
const dotenv = require('dotenv');


async function sleep(ms){
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function change_setting(settings){
  try{

    const file = await fs.readFile('.env', 'utf-8', (err, data) => {console.log('READING FILE ERR Data: '+err)});    

    let envConfig = dotenv.parse(file);
    for (let key in settings){ //updating the virtual copy of .env
      envConfig[key] = settings[key];
    }

    let newcontent = '';
    for (let key in envConfig){
      newcontent += `${key}=${envConfig[key]}\n`;
    }

    await fs.writeFile('.env', newcontent);

    console.log('.env file updated');
    return true;

  } catch (error){
    console.error(' ERROR editing config : ' + error);
    return false;
  }
}


module.exports = {sleep, change_setting};