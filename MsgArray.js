class MsgArray{
  constructor(size){
    this.size = size;
    this.items = [];
  }

  add(item){
    this.items.unshift(item); //adding the item to the start

    if (this.items.length > this.size){
      this.items.pop(); //removing the last item if it exceeds the size
    }
  }

  get(){
    return this.items;
  }

  getButAvoid(user){
    return this.items.filter(item => item.author.username !== user);
  }

  
}

module.exports = MsgArray;