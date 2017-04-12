'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
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

describe('Craft Beer Bot', () => {

  beforeEach(() => {
  })

  afterEach(() => {
  })

  describe("start ordering", () => {

    it('should ask what beer I would like', () => {
      var event = testEvent('OrderCraftBeer', 'DialogCodeHook', {}, {})
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal('Delegate')
        }
      })
    })

  })

  describe("order fullfilment", () => {

    it('should tell me the order has been places', () => {
      var event = testEvent('OrderCraftBeer', 'FulfillmentCodeHook', {}, {})
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.message.content).to.equal("I've placed the order")
        }
      })
    })

  })

})

function check(done, func) {
  try {
    func()
    done()
  } catch(e) {
    done(e)
  }
}
