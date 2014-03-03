/*
 * Formatter for Selenium 2 / WebDriver PHPUnit client.
 */

var subScriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
subScriptLoader.loadSubScript('chrome://selenium-ide/content/formats/webdriver.js', this);

function useSeparateEqualsForArray() {
  return true;
}

function testClassName(testName) {
  return testName.split(/[^0-9A-Za-z]+/).map(
      function(x) {
        return capitalize(x);
      }).join('');
}

function testMethodName(testName) {
  return "test" + testClassName(testName);
}

function nonBreakingSpace() {
  return "\"\\xa0\"";
}

function array(value) {
  var str = 'array(';
  for (var i = 0; i < value.length; i++) {
    str += string(value[i]);
    if (i < value.length - 1) str += ", ";
  }
  str += ')';
  return str;
}

Equals.prototype.toString = function() {
  return this.e1.toString() + " == " + this.e2.toString();
};

Equals.prototype.assert = function() {
  return "$this->assertEquals(" + this.e1.toString() + ", " + this.e2.toString() + ");";
};

Equals.prototype.verify = function() {
  return verify(this.assert());
};

NotEquals.prototype.toString = function() {
  return this.e1.toString() + " != " + this.e2.toString();
};

NotEquals.prototype.assert = function() {
  return "$this->assertNotEquals(" + this.e1.toString() + ", " + this.e2.toString() + ");";
};

NotEquals.prototype.verify = function() {
  return verify(this.assert());
};

function joinExpression(expression) {
  return "implode(',', " + expression.toString() + ")";
}

function statement(expression) {
  return expression.toString() + ';';
}

function assignToVariable(type, variable, expression) {
  return "$" + variable + " = " + expression.toString();
}

function ifCondition(expression, callback) {
  return "if (" + expression.toString() + ") {\n" + callback() + "}";
}

function assertTrue(expression) {
  return "$this->assertTrue(" + expression.toString() + ");";
}

function assertFalse(expression) {
  return "$this->assertFalse(" + expression.toString() + ");";
}

function verify(statement) {
  return "try {\n" +
        indent(1) + statement + "\n" +
        "} catch (PHPUnit_Framework_AssertionFailedError $e) {\n" +
        indent(1) + "array_push($this->verificationErrors, $e->toString());\n" +
        "}";
}

function verifyTrue(expression) {
  return verify(assertTrue(expression));
}

function verifyFalse(expression) {
  return verify(assertFalse(expression));
}

RegexpMatch.prototype.toString = function() {
  return "(bool)preg_match('/" + this.pattern.replace(/\//g, "\\/") + "/'," + this.expression + ")";
};

RegexpNotMatch.prototype.toString = function() {
    return "(bool)preg_match('/" + this.pattern.replace(/\//g, "\\/") + "/'," + this.expression + ")";
};

function waitFor(expression)
{
  return "for ($second = 0; ; $second++) {\n" +
        indent(1) + 'if ($second >= 60) $this->fail("timeout");\n' +
        indent(1) + "try {\n" +
        indent(2) + (expression.setup ? expression.setup() + " " : "") +
        indent(2) + "if (" + expression.toString() + ") break;\n" +
        indent(1) + "} catch (PHPUnit_Extensions_Selenium2TestCase_Exception $e) {}\n" +
        indent(1) + "sleep(1);\n" +
        "}\n";
}

function assertOrVerifyFailure(line, isAssert) {
  var message = '"expected failure"';
  var failStatement = isAssert ? "$this->fail(" + message  + ");" :
      "array_push($this->verificationErrors, " + message + ");";
  return "try { \n" +
      line + "\n" +
      failStatement + "\n" +
      "} catch (PHPUnit_Extensions_Selenium2TestCase_Exception $e) {}\n";
}

function pause(milliseconds) {
  return "sleep(" + (parseInt(milliseconds, 10) / 1000) + ");";
}

function echo(message) {
  return "print(" + xlateArgument(message) + ' . "\\n");';
}

function formatComment(comment) {
  return comment.comment.replace(/.+/mg, function(str) {
    return "// " + str;
  });
}

/**
 * Returns a string representing the suite for this formatter language.
 *
 * @param testSuite  the suite to format
 * @param filename   the file the formatted suite will be saved as
 */
function formatSuite(testSuite, filename) {
  var suiteClass = /^(\w+)/.exec(filename)[1];
  suiteClass = suiteClass[0].toUpperCase() + suiteClass.substring(1) + 'Test';

  //TODO: this could be taken from options.header
  var formattedSuite = "<?php\n"
      + "class " + suiteClass + " extends PHPUnit_Extensions_Selenium2TestCase\n"
      + "{\n"
      + indents(1) + "protected function setUp()\n"
      + indents(1) + "{\n"
      + indents(2) + "${receiver}->setBrowser(\"${environment}\");\n"
      + indents(2) + "${receiver}->setBrowserUrl(\"${baseURL}\");\n"
      + indents(2) + "${receiver}->setHost(\"localhost\");\n"
      + indents(2) + "${receiver}->setPort(4444);\n"
      + indents(1) + "}\n\n"
      + indents(1) + "public function setUpPage()\n"
      + indents(1) + "{\n"
      + indents(2) + "$this->timeouts()->implicitWait(10000);\n"
      + indents(1) + "}\n";

  formattedSuite = formattedSuite.
  replace(/\$\{receiver\}/g, options.receiver).
  replace(/\$\{environment\}/g, options.environment).
  replace(/\$\{baseURL\}/g, editor.app.getBaseURL());

  for (var i = 0; i < testSuite.tests.length; ++i) {
    var testClass = testSuite.tests[i].getTitle();
    //~ formattedSuite += indents(2)
        //~ + "suite.addTestSuite(" + testClass + ".class);\n";
    if (!testSuite.tests[i].content) {
      //Open the testcase, formats the commands from the stored html
      editor.app.showTestCaseFromSuite(testSuite.tests[i]);
    }
    formattedSuite += "\n" + indents(1)
        + "public function " + testMethodName(testClass) + "()\n"
        + indents(1) + "{\n"
        + formatCommands(testSuite.tests[i].content.commands).replace(/^/gm, indents(2))
        + indents(1) + "}\n";
  }

  formattedSuite += "\n" + indents(1) + "private function isElementPresent($how,$what)\n"
        + indents(1) + "{\n"
        + indents(2) + "try{\n"
        + indents(3) + "$this->element($this->using($how)->value($what));\n"
        + indents(3) + "return true;\n"
        + indents(2) + "} catch (PHPUnit_Extensions_Selenium2TestCase_Exception $e)\n"
        + indents(2) + "{\n"
        + indents(3) + "return false;\n"
        + indents(2) + "}\n"
        + indents(1) + "}\n"
        + indents(0) + "}\n"
        + indents(0) + "?>";

  return formattedSuite;
}

function defaultExtension() {
  return this.options.defaultExtension;
}

this.options = {
  receiver: "$this",
  environment: "firefox",
  indent:    '2',
  initialIndents:    '2',
  showSelenese: 'false',
  defaultExtension: "php"
};

options.header =
    "<?php\n" +
        "class ${className} extends PHPUnit_Extensions_Selenium2TestCase\n" +
        "{\n" +
        indents(1) + "protected function setUp()\n" +
        indents(1) + "{\n" +
        indents(2) + "${receiver}->setBrowser(\"${environment}\");\n" +
        indents(2) + "${receiver}->setBrowserUrl(\"${baseURL}\");\n" +
        indents(2) + "$this->setHost(\"localhost\");\n" +
        indents(2) + "$this->setPort(4444);\n" +
        indents(1) + "}\n\n" +
        indents(1) + "public function setUpPage()\n" +
        indents(1) + "{\n" +
        indents(2) + "$this->timeouts()->implicitWait(10000);\n" +
        indents(1) + "}\n\n" +
        indents(1) + "public function ${methodName}()\n" +
        indents(1) + "{\n";

options.footer =
        indents(1) + "}\n\n" +
        indents(1) + "private function isElementPresent($how,$what)\n" +
        indents(1) + "{\n" +
        indents(2) + "try{\n" +
        indents(3) + "$this->element($this->using($how)->value($what));\n" +
        indents(3) + "return true;\n" +
        indents(2) + "} catch (PHPUnit_Extensions_Selenium2TestCase_Exception $e)\n" +
        indents(2) + "{\n" +
        indents(3) + "return false;\n" +
        indents(2) + "}\n" +
        indents(1) + "}\n" +
        indents(0) + "}\n" +
        indents(0) + "?>";

this.configForm =
    '<description>Variable for Selenium instance</description>' +
        '<textbox id="options_receiver" />' +
        '<description>Browser</description>' +
        '<textbox id="options_environment" />' +
        '<description>Header</description>' +
        '<textbox id="options_header" multiline="true" flex="1" rows="4"/>' +
        '<description>Footer</description>' +
        '<textbox id="options_footer" multiline="true" flex="1" rows="4"/>' +
        '<description>Indent</description>' +
        '<menulist id="options_indent"><menupopup>' +
        '<menuitem label="Tab" value="tab"/>' +
        '<menuitem label="1 space" value="1"/>' +
        '<menuitem label="2 spaces" value="2"/>' +
        '<menuitem label="3 spaces" value="3"/>' +
        '<menuitem label="4 spaces" value="4"/>' +
        '<menuitem label="5 spaces" value="5"/>' +
        '<menuitem label="6 spaces" value="6"/>' +
        '<menuitem label="7 spaces" value="7"/>' +
        '<menuitem label="8 spaces" value="8"/>' +
        '</menupopup></menulist>' +
        '<checkbox id="options_showSelenese" label="Show Selenese"/>';

this.name = "PHPUnit (WebDriver)";
this.testcaseExtension = ".php";
this.suiteExtension = ".php";
this.webdriver = true;

WDAPI.Driver = function() {
  this.ref = options.receiver;
};

WDAPI.Driver.searchContext = function(locatorType, locator) {
  var locatorString = xlateArgument(locator);
  switch (locatorType) {
    case 'xpath':
      return '$this->byXPath(' + locatorString + ')';
    case 'css':
      return '$this->byCssSelector(' + locatorString + ')';
    case 'id':
      return '$this->byId(' + locatorString + ')';
    case 'link':
      return '$this->byLinkText(' + locatorString + ')';
    case 'name':
      return '$this->byName(' + locatorString + ')';
    case 'tag_name':
      return '$this->byTag(' + locatorString + ')';
  }
  throw 'Error: unknown strategy [' + locatorType + '] for locator [' + locator + ']';
};

WDAPI.Driver.prototype.back = function() {
  return this.ref + "->back()";
};

WDAPI.Driver.prototype.close = function() {
  return this.ref + "->closeWindow()";
};

WDAPI.Driver.prototype.findElement = function(locatorType, locator) {
  return new WDAPI.Element( WDAPI.Driver.searchContext(locatorType, locator) );
};

/* WDAPI.Driver.prototype.findElements = function(locatorType, locator) {
  return new WDAPI.ElementList(this.ref + ".findElements(" + WDAPI.Driver.searchContext(locatorType, locator) + ")");
}; */

WDAPI.Driver.prototype.getCurrentUrl = function() {
  return this.ref + "->url()";
};

WDAPI.Driver.prototype.get = function(url) {
  return this.ref + "->url(" + url + ")";
};

WDAPI.Driver.prototype.getTitle = function() {
  return this.ref + "->title()";
};

WDAPI.Driver.prototype.getAlert = function() {
  //return "closeAlertAndGetItsText()";
  return this.ref + "->alertText()";
};

WDAPI.Driver.prototype.chooseOkOnNextConfirmation = function() {
  return "acceptNextAlert = true";
};

WDAPI.Driver.prototype.chooseCancelOnNextConfirmation = function() {
  return "acceptNextAlert = false";
};

WDAPI.Driver.prototype.refresh = function() {
  return this.ref + "->refresh()";
};

WDAPI.Element = function(ref) {
  this.ref = ref;
};

WDAPI.Element.prototype.clear = function() {
  return this.ref + "->clear()";
};

WDAPI.Element.prototype.click = function() {
  return this.ref + "->click()";
};

WDAPI.Element.prototype.doubleClick = function() {
  return this.ref + "->doubleClick()";
};

WDAPI.Element.prototype.getAttribute = function(attributeName) {
  return this.ref + "->attribute(" + xlateArgument(attributeName) + ")";
};

WDAPI.Element.prototype.getText = function() {
  return this.ref + "->text()";
};

WDAPI.Element.prototype.isDisplayed = function() {
  return this.ref + "->displayed()";
};

WDAPI.Element.prototype.isSelected = function() {
  return this.ref + "->selected()";
};

WDAPI.Element.prototype.sendKeys = function(text) {
  return this.ref + "->keys(" + xlateArgument(text) + ")";
};

WDAPI.Element.prototype.submit = function() {
  return this.ref + "->submit()";
};

WDAPI.Element.prototype.getElementHeight = function() {
  return this.ref + "->size()[\"height\"]";
};

WDAPI.Element.prototype.getElementWidth = function() {
  return this.ref + "->size()[\"width\"]";
};

WDAPI.Element.prototype.select = function(selectLocator) {
  if (selectLocator.type == 'value') {
    return "$this->select(" + this.ref + ")->selectOptionByValue('" + selectLocator.string + "')";
  }
  if (selectLocator.type == 'label') {
    return "$this->select(" + this.ref + ")->selectOptionByLabel('" + selectLocator.string + "')";
  }
  //return "new Select(" + this.ref + ").selectByVisibleText(" + xlateArgument(selectLocator.string) + ")";
};

WDAPI.Element.prototype.removeAllSelections = function() {
  //return this.ref + "->select(" + WDAPI.Driver.searchContext(how, what) + ")->clearSelectedOptions()";
  return "$this->select(" + this.ref + ")->clearSelectedOptions()";
};

WDAPI.ElementList = function(ref) {
  this.ref = ref;
};

WDAPI.ElementList.prototype.getItem = function(index) {
  return this.ref + "[" + index + "]";
};

WDAPI.ElementList.prototype.getSize = function() {
  return this.ref + ".size()";
};

WDAPI.ElementList.prototype.isEmpty = function() {
  return this.ref + ".isEmpty()";
};

WDAPI.Utils = function() {
};

WDAPI.Utils.isElementPresent = function(how, what) {
  //return "$this->assertNotNull(" + WDAPI.Driver.searchContext(how, what) + ")";
  return "$this->isElementPresent(\"" + how + "\", \"" + what + "\")";
};
