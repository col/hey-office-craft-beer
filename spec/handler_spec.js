'use strict'

const expect = require('chai').expect
const sinon = require('sinon')
const BeerCatalog = require('../lib/beer_catalog')
const Handler = require('../lib/handler')
const CraftBeer = require("craft-beer")
var AWS = require('aws-sdk')

function testEvent(intentName = 'TestIntent', invocationSource = 'FulfillmentCodeHook', sessionAttributes = {}, slots = {}, confirmationStatus = 'None') {
  return {
    sessionAttributes: sessionAttributes,
    invocationSource: invocationSource,
    currentIntent: {
      name: intentName,
      slots: slots,
      confirmationStatus: confirmationStatus
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
      event = testEvent('AddCraftBeer', 'DialogCodeHook', {beers: "[]"}, {CraftBeer: paleAle.name, OTP: null})
    })

    it('should add the beer to the order', (done) => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.sessionAttributes.beers).to.equal('[{"id":177,"name":"Yenda Pale Ale"}]')
          done()
        }
      })
    })

    it('should add the beer to the order', (done) => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal("ConfirmIntent")
          expect(response.dialogAction.intentName).to.equal("OrderCraftBeer")
          expect(response.dialogAction.slots).to.eql({CraftBeer: paleAle.name, OTP: null})
          expect(response.dialogAction.message.content).to.equal("Ok, so that's 1 case of Yenda Pale Ale. Should I place the order now?")
          done()
        }
      })
    })

    describe("when the requested beer is not found", () => {
      beforeEach(() => {
        event = testEvent('AddCraftBeer', 'DialogCodeHook', {beers: []}, {CraftBeer: "Tiger", OTP: null})
      })

      it("should tell the user it's not available", (done) => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            expect(response.dialogAction.message.content).to.equal('Oh no! This beer is not available.')
            done()
          }
        })
      })
    })

  })

  describe("when there is NOT an existing order", () => {
    beforeEach(() => {
      event = testEvent('AddCraftBeer', 'DialogCodeHook', {}, {CraftBeer: paleAle.name, OTP: null})
    })

    it('should not create an order', (done) => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal('Close')
          expect(response.dialogAction.fulfillmentState).to.equal('Fulfilled')
          expect(response.sessionAttributes).to.eql({})
          done()
        }
      })
    })
  })

})

describe('OrderCraftBeer Intent', () => {
  var event = null

  describe("start ordering", () => {
    beforeEach(() => {
      event = testEvent('OrderCraftBeer', 'DialogCodeHook', {}, {CraftBeer: null, OTP: null})
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
      event = testEvent('OrderCraftBeer', 'DialogCodeHook', {}, {CraftBeer: "Yenda Pale Ale", OTP: null})
    })

    it('should create a new beer order with the specified beer', (done) => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.sessionAttributes.beers).to.eql('[{"id":177,"name":"Yenda Pale Ale"}]')
          done()
        }
      })
    })

    it('should confirm if the user wants to submit the order', (done) => {
      Handler.craftBeerBot(event, {
        succeed: function(response) {
          expect(response.dialogAction.type).to.equal("ConfirmIntent")
          expect(response.dialogAction.intentName).to.equal("OrderCraftBeer")
          expect(response.dialogAction.message.content).to.equal("Ok, so that's 1 case of Yenda Pale Ale. Should I place the order now?")
          done()
        }
      })
    })
  })

  describe("confirmation", () => {

    describe("when the confirmation is accepted", () => {
      var snsStub = null
      var snsPublishStub = null
      beforeEach(() => {
        event = testEvent(
          'OrderCraftBeer',
          'DialogCodeHook',
          {beers:'[{"id": 133, "name":"Yenda Pale Ale"}]'},
          {CraftBeer: null, OTP: null},
          "Confirmed"
        )
        snsStub = sinon.stub(AWS, "SNS")
        snsPublishStub = sinon.stub().callsArgWith(1, null, {})
        snsStub.prototype.publish = snsPublishStub
      })

      afterEach(() => {
        snsStub.restore()
      })

      it('should generate a valid otp', (done) => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            var otp = parseInt(response.sessionAttributes.otp)
            expect(otp).to.be.above(999)
            expect(otp).to.be.below(9999)
            done()
          }
        })
      })

      it('should send the otp to the user via SMS', (done) => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            sinon.assert.calledWith(snsPublishStub, {
              Message: sinon.match(/^HeyOffice Craft Beer Confirmation Code: \d{4}/),
              MessageStructure: 'string',
              PhoneNumber: '+6583677493',
              MessageAttributes: {
                  'AWS.SNS.SMS.SenderID': { StringValue: 'HeyOffice', DataType: 'String' },
                  'AWS.SNS.SMS.SMSType': { StringValue: 'Transactional', DataType: 'String' }
              }
            })
            done()
          }
        })
      })

      it('should ask the user to enter the otp', (done) => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            expect(response.dialogAction.message.content).to.equal("Please enter the confirmation code")
            expect(response.dialogAction.type).to.equal('ElicitSlot')
            expect(response.dialogAction.slotToElicit).to.equal('OTP')
            done()
          }
        })
      })

      describe("when the user provides an invalid OTP", (done) => {
        beforeEach(() => {
          event = testEvent(
            'OrderCraftBeer',
            'DialogCodeHook',
            {beers:'[{"id": 133, "name":"Yenda Pale Ale"}]', otp:"1234"},
            {CraftBeer: null, OTP: "6666"},
            "Confirmed"
          )
        })

        it('should tell the user the OTP was wrong and prompt again', (done) => {
          Handler.craftBeerBot(event, {
            succeed: function(response) {
              expect(response.dialogAction.message.content).to.equal("Confirmation code was incorrect. Please try again.")
              expect(response.dialogAction.type).to.equal('ElicitSlot')
              expect(response.dialogAction.slotToElicit).to.equal('OTP')
              done()
            }
          })
        })
      })

      describe("when the user provides the correct OTP", (done) => {
        beforeEach(() => {
          event = testEvent(
            'OrderCraftBeer',
            'DialogCodeHook',
            {beers:'[{"id": 133, "name":"Yenda Pale Ale"}]', otp:"1234"},
            {CraftBeer: null, OTP: "1234"},
            "None"
          )
          sinon.stub(CraftBeer, 'login').returns(Promise.resolve("example-session-token"))
          sinon.stub(CraftBeer, 'addToCart').returns(Promise.resolve())
          sinon.stub(CraftBeer, 'checkout').returns(Promise.resolve())
        })

        afterEach(() => {
          CraftBeer.login.restore()
          CraftBeer.addToCart.restore()
          CraftBeer.checkout.restore()
        })

        it('should submit the order', (done) => {
          process.env.CRAFTBEER_USERNAME = "test_user"
          process.env.CRAFTBEER_PASSWORD = "password"
          process.env.CRAFTBEER_ADDRESS_ID=123
          process.env.CRAFTBEER_CC_NAME="John Smith"
          process.env.CRAFTBEER_CC_TYPE="AMEX"
          process.env.CRAFTBEER_CC_NUMBER="123456789012345"
          process.env.CRAFTBEER_CC_EXPIRY_MONTH="01"
          process.env.CRAFTBEER_CC_EXPIRY_YEAR=20
          process.env.CRAFTBEER_CC_CCV=1234

          Handler.craftBeerBot(event, {
            succeed: function(response) {
              sinon.assert.calledWith(CraftBeer.login, "test_user", "password")
              sinon.assert.calledWith(CraftBeer.addToCart, "example-session-token", 133)
              sinon.assert.calledWith(CraftBeer.checkout, "example-session-token", "123", "John Smith", "AMEX", "123456789012345", "01", "20", "1234")
              done()
            }
          })
        })

        describe("when the order is successful", () => {
          it('should tell the user the order has been placed', (done) => {
            Handler.craftBeerBot(event, {
              succeed: function(response) {
                expect(response.dialogAction.message.content).to.equal("I've placed the order")
                expect(response.dialogAction.type).to.equal('Close')
                expect(response.dialogAction.fulfillmentState).to.equal('Fulfilled')
                done()
              }
            })
          })
        })

        describe("when the order fails", () => {
          beforeEach(() => {
            CraftBeer.checkout.restore()
            sinon.stub(CraftBeer, 'checkout').returns(Promise.reject('credit card declined'))
          })

          it('should tell the user there was an error', (done) => {
            Handler.craftBeerBot(event, {
              succeed: function(response) {
                expect(response.dialogAction.message.content).to.equal("The was a problem placing the order. Please try again later.")
                expect(response.dialogAction.type).to.equal('Close')
                expect(response.dialogAction.fulfillmentState).to.equal('Fulfilled')
                done()
              }
            })
          })
        })

      })

    })

    describe("when the confirmation is denied", () => {
      beforeEach(() => {
          event = testEvent('OrderCraftBeer', 'DialogCodeHook', {}, {CraftBeer: null, OTP: null}, "Denied")
      })

      it('should say goodbye', (done) => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            expect(response.dialogAction.message.content).to.equal('Goodbye')
            done()
          }
        })
      })

      it('should close the session', (done) => {
        Handler.craftBeerBot(event, {
          succeed: function(response) {
            expect(response.dialogAction.type).to.equal('Close')
            expect(response.dialogAction.fulfillmentState).to.equal('Fulfilled')
            done()
          }
        })
      })
    })
  })

  describe("order fullfilment", () => {

      // TODO: Not sure when the fulfillment handler is actually called ATM

  })

})
