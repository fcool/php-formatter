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
  return this.e1.toString() + " === trim(" + this.e2.toString() + ")";
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
  return statement + "\n";
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
    return new WDAPI.Driver().wait(10).until(expression.toString()) + ';';
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
      + indents(2) + "$capabilities = new DesiredCapabilities::${environment};\n"
      + indents(2) + "${receiver} = RemoteWebDriver::create('http://192.168.170.142:4444/wd/hub', $capabilites);\n"
      + indents(1) + "}\n\n";

  formattedSuite = formattedSuite.
  replace(/\$\{receiver\}/g, options.receiver).
  replace(/\$\{environment\}/g, options.environment);

  for (var i = 0; i < testSuite.tests.length; ++i) {
    var testClass = testSuite.tests[i].getTitle();
    //~ formattedSuite += indents(2)
        //~ + "suite.addTestSuite(" + testClass + ".class);\n";
    if (!testSuite.tests[i].content) {
      //Open the testcase, formats the commands from the stored html
      editor.app.showTestCaseFromSuite(testSuite.tests[i]);
    }
    formattedSuite += "\n" + indents(1)
        + "public function " + testMethodName(testClass) + "() {\n"
        + formatCommands(testSuite.tests[i].content.commands).replace(/^/gm, indents(2))
        + indents(1) + "}\n";
  }

  formattedSuite += "\n" + indents(1) + "private function isElementPresent($locator)\n"
        + indents(1) + "{\n"
        + indents(2) + "try{\n"
        + indents(3) + "$this->driver->findElement($locator);\n"
        + indents(3) + "return true;\n"
        + indents(2) + "} catch (NoSuchElementException $e)\n"
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
  receiver: "$this->driver",
  environment: "firefox",
  indent:    '2',
  initialIndents:    '2',
  showSelenese: 'false',
  defaultExtension: "php"
};

options.header =
    "<?php\n" +
        "class ${className} extends PHPUnit_Framework_TestCase{\n" +
        indents(1) + "protected $driver\n" +

        indents(1) + "{\n" +
        indents(2) + "$capabilities = DesiredCapabilities::${environment}();\n" +
        indents(2) + "${receiver} = RemoteWebDriver::create(\"localhost\", $capabilities, 4444);\n" +
        indents(1) + "}\n\n" +
        indents(1) + "public function ${methodName}() {\n";

options.footer =
        indents(1) + "}\n\n" +
        indents(1) + "private function isElementPresent($locator)\n" +
        indents(1) + "{\n" +
        indents(2) + "try{\n" +
        indents(3) + "$this->driver->findElement($locator);\n" +
        indents(3) + "return true;\n" +
        indents(2) + "} catch (NoSuchElementException $e)\n" +
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

this.name = "PHPUnit and Facebook - WebDriver";
this.testcaseExtension = ".php";
this.suiteExtension = ".php";
this.webdriver = true;

WDAPI.Driver = function() {
    this.ref = options.receiver;
    this.findElement = function(locatorType, locator) {
        return new WDAPI.Element( this.ref + "->findElement(" + this.searchContext(locatorType, locator) + ")" );
    };
    this.findElements = function(locatorType, locator) {
        return new WDAPI.ElementList(this.ref + "->findElements(" + this.searchContext(locatorType, locator) + ")");
    };
    this.searchContext = function(locatorType, locator) {
        var locatorString = xlateArgument(locator);
        switch (locatorType) {
            case 'xpath':
                return 'WebDriverBy::xpath(' + locatorString + ')';
            case 'css':
                return 'WebDriverBy::cssSelector(' + locatorString + ')';
            case 'id':
                return 'WebDriverBy::id(' + locatorString + ')';
            case 'link':
                return 'WebDriverBy::partialLinkText(' + locatorString + ')';
            case 'name':
                return 'WebDriverBy::name(' + locatorString + ')';
            case 'tag_name':
                return 'WebDriverBy::tagName(' + locatorString + ')';
            case 'class_name':
                return 'WebDriverBy::className(' + locatorString + ')';
        }
        throw 'Error: unknown strategy [' + locatorType + '] for locator [' + locator + ']';
    };
    this.wait = function(timeout) {
        return new WDAPI.DriverWait(this.ref, timeout);
    };
    this.refresh = function() {
        return this.navigate().refresh();
    };

    this.get = function(url) {
        return this.ref + "->get(" + url + ")";
    };

    this.getCurrentUrl = function() {
        return this.ref + "->getCurrentUrl()";
    };

    this.getPageSource = function() {
        return this.ref + "->getPageSource()";
    };

    this.getTitle = function() {
        return this.ref + "->getTitle()";
    };

    //getWindowHandle
    //getWindowHandles
    //quit
    //takeScreenshot
    //wait

    this.navigate = function() {
        return new WDAPI.Navigate(this.ref);
    };

    this.manage = function() {
        return new WDAPI.Options(this.ref);
    };

    this.window = function() {
        return new WDAPI.Window(this.ref);
    };

    this.switchTo = function() {
        return new WDAPI.TargetLocator(this.ref);
    };
};

WDAPI.Navigate = function(ref) {
    this.ref = ref + '->navigate()';

    this.refresh = function() {
        return this.ref + '->refresh()';
    }
};

WDAPI.Options = function(ref) {
    this.ref = ref + '->manage()';

    this.deleteAllCookies = function() {
        return this.ref + '->deleteAllCookies()'
    };
    this.deleteCookieNamed = function(name) {
        return this.ref + '->deleteCookieNamed("' + name + '")';
    };
    this.getCookieNamed = function(name) {
        return this.ref + '->getCookieNamed("' + name + '")';
    };
    this.addCookie = function(cookie) {
        var values = "";
        for (var i in cookie) {
            if (cookie[i]) {
                values += '"' + i + '" => "' + cookie[i] + '",'
            }
        }
        return this.ref + '->addCookie(array(' + values + '))'
    };
};

WDAPI.Window = function(ref) {
    this.ref = ref + '->window()';
    //getPosition
    //getSize
    this.maximize = function() {
        return this.ref + '->maximize()';
    };
    //setSize
    //setPosition
    //getScreenOrientation
    //setScreenOrientation
};

WDAPI.DriverWait = function(ref, timeOut) {
    this.ref = ref + '->wait('+timeOut+')';
    this.until = function(condition) {
        return this.ref + '->until(function() {return ' + condition + ';})';
    }
};

WDAPI.TargetLocator = function(ref) {
    this.ref = ref + '->switchTo';

    this.frame = function(locator) {
        return this.ref + '->frame(' + locator.toString() + ')';
    }
};

WDAPI.Element = function(ref) {
  this.ref = ref;
    this.toString = function() {
        return this.ref;
    }
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
  return this.ref + "->getText()";
};

WDAPI.Element.prototype.isDisplayed = function() {
  return this.ref + "->displayed()";
};

WDAPI.Element.prototype.isEditable = function() {
  return this.ref + "->enabled()";
};

WDAPI.Element.prototype.isSelected = function() {
  return this.ref + "->selected()";
};

WDAPI.Element.prototype.sendKeys = function(text) {
  return this.ref + "->sendKeys(" + xlateArgument(text) + ")";
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
    return '$select = new WebdriverSelect(' + this.ref + "); $select->selectByValue('" + selectLocator.string + "')";
  }
  if (selectLocator.type == 'label') {
    return '$select = new WebdriverSelect(' + this.ref + "); $select->selectByVisibleText('" + selectLocator.string + "')";
  }
  //return "new Select(" + this.ref + ").selectByVisibleText(" + xlateArgument(selectLocator.string) + ")";
};

WDAPI.Element.prototype.removeAllSelections = function() {
  //return this.ref + "->select(" + WDAPI.Driver.searchContext(how, what) + ")->clearSelectedOptions()";
  return "$select = new WebdriverSelect(" + this.ref + "); $select->deselectAll()";
};

WDAPI.ElementList = function(ref) {
  this.ref = ref;

    this.getItem = function(index) {
        return this.ref + "[" + index + "]";
    };

    this.getSize = function() {
        //return this.ref + ".size()";
        return "count(" + this.ref + ")";
    };

    this.isEmpty = function() {
        //return this.ref + ".isEmpty()";
        return "count(" + this.ref + ") == 0";
    };
};

WDAPI.Utils = function() {
};

WDAPI.Utils.isElementPresent = function(how, what) {
    //return "$this->assertNotNull(" + WDAPI.Driver.searchContext(how, what) + ")";
    return "$this->isElementPresent(" + new WDAPI.Driver().searchContext(how, what) + ")";
};

SeleniumWebDriverAdaptor.prototype.deleteAllVisibleCookies = function() {
    return new WDAPI.Driver().manage().deleteAllCookies();
};

SeleniumWebDriverAdaptor.prototype.deleteCookie = function() {
    return new WDAPI.Driver().manage().deleteCookieNamed(this.rawArgs[0].replace(/name=/, ''));
};

SeleniumWebDriverAdaptor.prototype.getCookieByName = function() {
    return new WDAPI.Driver().manage().getCookieNamed(this.rawArgs[0]) + "['value']";
};

//TODO: createCookie
SeleniumWebDriverAdaptor.prototype.createCookie = function() {
    var nameValue = this.rawArgs[0].split("="), cookie = {'name' : null, 'value': null, 'domain': null, 'path': null};
    cookie.name = nameValue[0];
    cookie.value = nameValue[1];

    if (this.rawArgs.length > 1) {
        var parts = this.rawArgs[1].split(",");
        for(var i = 0; i < parts.length; i++) {
            var keyValue = parts[i].split("=");
            cookie[keyValue[0]] = keyValue[1];
        }
    }

    return new WDAPI.Driver().manage().addCookie(cookie);
};

SeleniumWebDriverAdaptor.prototype.selectWindow = function() {
    if (!this.rawArgs[0] || this.rawArgs[0] === 'null') {
        throw new {message: 'In WebdriverConcept, there is no main window to switch back'};
    }
};

SeleniumWebDriverAdaptor.prototype.windowMaximize = function() {
    return new WDAPI.Driver().manage().window().maximize();
};

SeleniumWebDriverAdaptor.prototype.selectFrame = function() {
    if (!this.rawArgs[0] || this.rawArgs[0] === 'null') {
        throw new {message: 'In WebdriverConcept, there is no main window to switch back'};
    }
    var locator = this._elementLocator(this.rawArgs[0]), driver = new WDAPI.Driver();
    return driver.switchTo().frame(driver.findElement(locator.type, locator.string));
};