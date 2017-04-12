var {defineSupportCode} = require('cucumber')
var AWS = require('aws-sdk')
var expect = require('chai').expect
var fs = require('fs')

const Lex = new AWS.LexRuntime({
  apiVersion: '2016-11-28',
  signatureVersion: 'v4',
  region: 'us-east-1'
})

var botName = "HeyOffice"
var aliasName = "$LATEST"
var userId = "123456789"

function buildLexRequestParams(input) {
  return {
    botAlias: aliasName,
    botName: botName,
    inputText: input,
    userId: userId,
    sessionAttributes: {}
  };
}

var response = null;

defineSupportCode(function({Then, When}) {

    When(/^I say "([^"]*)"$/, function(input, callback) {
        var params = buildLexRequestParams(input)
        Lex.postText(params, function(err, data) {
          console.log("response data = ", data)
          response = data.message
          callback()
        });
    })

    Then(/^I receive "([^"]*)"$/, function(output, callback) {
        expect(response).to.equal(output)
        callback()
    })

    Then(/^I receive a response that starts with "([^"]*)"$/, function(output, callback) {
        expect(response).to.contain(output)
        callback()
    })

    Then(/^I am prompted for the "([^"]*)"$/, function(slot_name, callback) {
      fs.readFile(`./lex_config/${slot_name}_prompts.txt`, 'utf8', (err, data) => {
        expect(err).to.be.nil
        var matchingPrompt = data.split('\n').filter((prompt) => {
          return prompt === response
        })
        expect(matchingPrompt).to.not.be.empty
        callback()
      })
    })

})
