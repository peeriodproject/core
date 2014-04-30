# Code Styles

Als Basis für die Code-Style dient die  `./codeStyleSettings.xml`. Diese muss in den (ignorierten) `.idea`-Ordner verschoben werden.

__Für alle Listen in diesem Dokument gilt: Eine Leerzeile zwischen den Items!__

## Module

Module sollten nur bei kleinen, zusammenhängenden Klassen & Interfaces konstruiert werden. Siehe z.B. `./core/config/Config.ts`

## Interfaces

Interfaces sind getrennt von den Implementationen in einer `./interfaces/InterfaceName.ts` Datei.
Die Methoden sind alphabetisch geordnet.

```
// ./interfaces/FooBar.ts
interface FooBar {}
export = FooBar
```

Sollte eine Typescript-Definition __mehr als einmal__ im gleichen Zusammenhang verwendet werden, muss diese in ein eigenes Interface gekapselt werden.

```
// Bad:
getConfigKeys():Array<string>
setConfigKeys(keys:Array<string>)

// Good:
interface ConfigKeyList extends Array<string> {}

getConfigKeys():ConfigKeyList
setConfigKeys(keys:ConfigKeyList)

```

## Klassen

Eine Datei pro Klasse. Die Datei exportiert die Klasse direct. Der Dateiname entspricht dem Klassennamen.

```
// FooBar.ts
class FooBar {}
export = FooBar
```

Die Datei ist wie folgt aufgebaut:

1. Interface Imports `<reference path'../InterfaceName.d.ts' />`
2. Node-Core Module Imports `require('net')`
2. Externe Node-Module imports `require('thirdparty-foobar')`
3. Datei-Imports `require('../src/Foo')`
4. Der Kommentar der Klasse

Eine Klasse ist in die folgenden Gruppen gegliedert, die Mitglieder einer Gruppe sind alphabetisch sortiert.

1. Properties
2. Statics
3. Constructor
4. Public
5. Private


Klassen __erhalten alle Dependencies__ als __Constructor-Injection__. Es wird __niemals eine Implementation erzeugt__ (`new FooBar`). Der letzte Parameter ist ein (optionales) Optionen-Object.

## Methodennamen

Methodennamen wenn möglich in die

## Options

Optionen sind Interfaces die die Optionen eines Objects in alphabetischer Reihenfolge definieren. 

`interface ObjectNameOptions {}`


## Kommentare

Der TSDoc-Generator analysiert __keinen__ Code und erhält seine Informationen __nur__ aus den Kommentaren.
Dater müssen `@class`, `@interface`, `@member`, `@method` etc. überall angegeben werden.

Weitere Infos [http://usejsdoc.org/tags-type.html](http://usejsdoc.org/tags-type.html)

Kommentiert werden in erster Linie die Interface-Methoden. 

### Klassen und Interfaces

Über der Klasse/dem Interface ist der Kommentar in die folgenden Bereiche eingeteilt:

1. Ausführliche Beschreibung
2. Beschreibung des Objects (`@class`, `@interface`, `@extends`, `@implements`)
3. Evtl. Beispiel, todo etc.
4. Die Parameter des Constructors

```
/**
 * Description
 *
 * @interface
 * @class topology.BucketInterface
 * @extends utils.ClosableInterface
 *
 * todo foobar
 * @example
 *		var foo = false;
 *
 * @param {namespace.InterfaceName} parameterName Description
 */
```

### Properties

Properties IMMER konstruieren (v8 hidden classes)

1. Beschreibung des Properties
2. Typ (private, static), Member

```
/**
 * Description
 *
 * @private
 * @member {namespaced.type} ClassName#_propertyName
 */
```

### Methoden

1. Beschreibung der Methode
2. Typ (private, static), Member
3. Parameter, Return der Methode

```
/**
 * Description
 *
 * @private
 * @method ClassName(.#~ static,instance,inner)
 *
 * @param {namespace.InterfaceName} parameterName Description
 * @returns {boolean} Description
 */
```

## Code

- Aussagekräftige Funktions- und Klassennamen
- Code gegen Interfaces schreiben – nicht gegen Implementationen
- `'` vor `"`
- Leerzeile vor `return` Statement
- Inline-Kommentare beginnen mit `// `
- __keine__ Kommentare hinter den Code, immer drüber
- __keine__ `if` one-liner
- Eine Leerzeile zwischen Methoden
- Eine Leerzeile vor und nach Loops
- Eine Leerzeile innerhalb der Klasse/Interface, etc.
- Jede Variable mit `var` am Anfang des _Levels_ mit `var typescript:Type` deklarieren – Leerzeile am Ende des Variablen-Blocks.
- Anonyme Funktionen so kurz wie möglich halten _(v8 performance)_
- Private Methoden/Properties beginnen mit `_`
- Variablen, Methoden, Properties, Klassen, Interfaces, Module und Event-Namen in `lowerCamelCase`
- Bei Vergleichen gegen definierte Primitive steht das Primitive auf der rechten Seite.

	`if (err.code === 'MODULE_NOT_FOUND')`
	`if (err.code === 1)`
- Java-Style für Array/Object Deklarationen `Array<string>`, `[key:string]: Object`

## Error

- sync: throw Error
- async: (err instanceof Error, res)
- emitter.emit('error', err instanceof Error)

http://stackoverflow.com/questions/7310521/node-js-best-practice-exception-handling
http://www.nodewiz.biz/nodejs-error-handling-pattern/

- Fehler haben das folgende Format: `Class.method: message`


## Tests

Die Tests einer Implementation sollte alle Methoden des Interfaces berücksichtigen. Sie müssen aber nicht in "Test pro Methode" aufgeteilt sein.

Der Test einer Implementation ist vollständig, sobald min. __95% Coverage__ erreicht sind.

