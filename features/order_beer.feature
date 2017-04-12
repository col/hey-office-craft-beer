Feature: As a user, I want to quickly order beer for the office

  Scenario: Order a single case of craft beer
    When I say "Order some craft beer"
    Then I receive "What type of beer would you like?"
    When I say "Yenda Pale Ale"
    Then I receive "Ok, so I'll place an order for:\n 1 x yenda pale ale\nIs this correct?"
    When I say "Yes"
    Then I receive "I've placed the order"
