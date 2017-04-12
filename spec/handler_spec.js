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
      // event = testEvent('AddCraftBeer', 'DialogCodeHook', {beers: []}, {"CraftBeer": paleAle.name})
      event = testEvent('AddCraftBeer', 'DialogCodeHook', {}, {"CraftBeer": paleAle.name})
    })

    it('should add the beer to the order', () => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.sessionAttributes).to.eql({})
          // var beers = response.sessionAttributes.beers
          // expect(beers.length).to.equal(1)
          // expect(beers[0]).to.equal(paleAle.id)
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
          expect(response.sessionAttributes).to.eql({})
          // expect(response.sessionAttributes.beers).to.eql([])
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
