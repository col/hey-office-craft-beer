'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
const BeerCatalog = require('../lib/beer_catalog')
const Handler = require('../lib/handler')

function testEvent(intentName, invocationSource, sessionAttributes, slots) {
  intentName = intentName || 'TestIntent'
  invocationSource = invocationSource || 'FulfillmentCodeHook'
  sessionAttributes = sessionAttributes || {}
  slots = slots || {}
  return {
    sessionAttributes: sessionAttributes,
    invocationSource: invocationSource,
    currentIntent: {
      name: intentName,
      slots: slots
    }
  }
}

function check(done, func) {
  try {
    func()
    done()
  } catch(e) {
    done(e)
  }
}

describe('AddCraftBeer Intent', () => {
  var event = null
  var findByNameStub = null
  var paleAle = {id: 177, name: "Yenda Pale Ale"}

  beforeEach(() => {
    findByNameStub = sinon.stub(BeerCatalog, 'findByName')
    findByNameStub.withArgs(paleAle.name).returns(paleAle)
  })

  afterEach(() => {
    findByNameStub.restore()
  })

  describe("when there is an existing order", () => {
    beforeEach(() => {
      event = testEvent('AddCraftBeer', 'DialogCodeHook', {beers: "[]"}, {"CraftBeer": paleAle.name})
    })

    it('should add the beer to the order', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.sessionAttributes.beers).to.equal('[{"id":177,"name":"Yenda Pale Ale"}]')
        }
      })
    })

    it('should add the beer to the order', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal("ConfirmIntent")
          expect(response.dialogAction.intentName).to.equal("OrderCraftBeer")
          expect(response.dialogAction.slots).to.eql({"CraftBeer": paleAle.name})
          expect(response.dialogAction.message.content).to.equal("Ok, so that's 1 case of Yenda Pale Ale. Should I place the order now?")
        }
      })
    })

    describe("when the requested beer is not found", () => {
      beforeEach(() => {
        event = testEvent('AddCraftBeer', 'DialogCodeHook', {beers: []}, {"CraftBeer": "Tiger"})
      })

      it("should tell the user it's not available", () => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            expect(response.dialogAction.message.content).to.equal('Oh no! This beer is not available.')
          }
        })
      })
    })

  })

  describe("when there is NOT an existing order", () => {
    beforeEach(() => {
      event = testEvent('AddCraftBeer', 'DialogCodeHook', {}, {"CraftBeer": paleAle.name})
    })

    it('should not create an order', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal('Close')
          expect(response.dialogAction.fulfillmentState).to.equal('Fulfilled')
          expect(response.sessionAttributes).to.eql({})
        }
      })
    })
  })

})

describe('OrderCraftBeer Intent', () => {
  var event = null

  describe("start ordering", () => {
    beforeEach(() => {
      event = testEvent('OrderCraftBeer', 'DialogCodeHook', {}, {CraftBeer: null})
    })

    it('should create a new beer order', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.sessionAttributes.beers).to.eql("[]")
        }
      })
    })

    it('should ask what beer I would like', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal('Delegate')
        }
      })
    })
  })

  describe("specify some beer", () => {
    beforeEach(() => {
      event = testEvent('OrderCraftBeer', 'DialogCodeHook', {}, {CraftBeer: "Yenda Pale Ale"})
    })

    it('should create a new beer order with the specified beer', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.sessionAttributes.beers).to.eql('[{"id":177,"name":"Yenda Pale Ale"}]')
        }
      })
    })

    it('should confirm if the user wants to submit the order', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal("ConfirmIntent")
          expect(response.dialogAction.intentName).to.equal("OrderCraftBeer")
          expect(response.dialogAction.message.content).to.equal("Ok, so that's 1 case of Yenda Pale Ale. Should I place the order now?")
        }
      })
    })
  })

  describe("order fullfilment", () => {

    it('should tell me the order has been placed', () => {
      var event = testEvent('OrderCraftBeer', 'FulfillmentCodeHook', {}, {})
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.message.content).to.equal("I've placed the order")
        }
      })
    })

  })

})
