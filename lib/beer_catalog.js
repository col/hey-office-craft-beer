'use strict';

const CRAFT_BEERS = [
  {id: 133, name: "Sambrooks Battersea IPA"},
  {id: 176, name: "Yenda Crisp Lager"},
  {id: 177, name: "Yenda Pale Ale"},
  {id: 178, name: "Yenda Golden Ale"},
  {id: 179, name: "Yenda IPA"},
]

module.exports = {
  allCraftBeers: function() {
    return CRAFT_BEERS;
  },

  findByName: function(name) {
    return CRAFT_BEERS.filter((beer) => { return beer.name.toUpperCase() == name.toUpperCase() })[0]
  },

  findById: function(id) {
    return CRAFT_BEERS.filter((beer) => { return beer.id == id })[0]
  }

}
