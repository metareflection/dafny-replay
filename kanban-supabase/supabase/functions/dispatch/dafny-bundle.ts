// Dafny Kanban Domain Bundle for Deno Edge Function
// AUTO-GENERATED - DO NOT EDIT
// Regenerate with: node build-bundle.js

import BigNumber from 'https://esm.sh/bignumber.js@9.1.2';

BigNumber.config({ MODULO_MODE: BigNumber.EUCLID });

// Dafny runtime mock for require
const require = (mod: string) => {
  if (mod === 'bignumber.js') return BigNumber;
  throw new Error(`Unknown module: ${mod}`);
};

// deno-lint-ignore no-unused-vars
const exports = {};
// deno-lint-ignore no-unused-vars
const module = { exports };

// Evaluate Dafny code
const initDafny = new Function('require', 'exports', 'module', `
// Dafny program KanbanMultiCollaboration.dfy compiled into JavaScript
// Copyright by the contributors to the Dafny Project
// SPDX-License-Identifier: MIT

const BigNumber = require('bignumber.js');
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID })
let _dafny = (function() {
  let \$module = {};
  \$module.areEqual = function(a, b) {
    if (typeof a === 'string' && b instanceof _dafny.Seq) {
      // Seq.equals(string) works as expected,
      // and the catch-all else block handles that direction.
      // But the opposite direction doesn't work; handle it here.
      return b.equals(a);
    } else if (typeof a === 'number' && BigNumber.isBigNumber(b)) {
      // This conditional would be correct even without the \`typeof a\` part,
      // but in most cases it's probably faster to short-circuit on a \`typeof\`
      // than to call \`isBigNumber\`. (But it remains to properly test this.)
      return b.isEqualTo(a);
    } else if (typeof a !== 'object' || a === null || b === null) {
      return a === b;
    } else if (BigNumber.isBigNumber(a)) {
      return a.isEqualTo(b);
    } else if (a._tname !== undefined || (Array.isArray(a) && a.constructor.name == "Array")) {
      return a === b;  // pointer equality
    } else {
      return a.equals(b);  // value-type equality
    }
  }
  \$module.toString = function(a) {
    if (a === null) {
      return "null";
    } else if (typeof a === "number") {
      return a.toFixed();
    } else if (BigNumber.isBigNumber(a)) {
      return a.toFixed();
    } else if (a._tname !== undefined) {
      return a._tname;
    } else {
      return a.toString();
    }
  }
  \$module.escapeCharacter = function(cp) {
    let s = String.fromCodePoint(cp.value)
    switch (s) {
      case '\\n': return "\\\\n";
      case '\\r': return "\\\\r";
      case '\\t': return "\\\\t";
      case '\\0': return "\\\\0";
      case '\\'': return "\\\\'";
      case '\\"': return "\\\\\\"";
      case '\\\\': return "\\\\\\\\";
      default: return s;
    };
  }
  \$module.NewObject = function() {
    return { _tname: "object" };
  }
  \$module.InstanceOfTrait = function(obj, trait) {
    return obj._parentTraits !== undefined && obj._parentTraits().includes(trait);
  }
  \$module.Rtd_bool = class {
    static get Default() { return false; }
  }
  \$module.Rtd_char = class {
    static get Default() { return 'D'; }  // See CharType.DefaultValue in Dafny source code
  }
  \$module.Rtd_codepoint = class {
    static get Default() { return new _dafny.CodePoint('D'.codePointAt(0)); }
  }
  \$module.Rtd_int = class {
    static get Default() { return BigNumber(0); }
  }
  \$module.Rtd_number = class {
    static get Default() { return 0; }
  }
  \$module.Rtd_ref = class {
    static get Default() { return null; }
  }
  \$module.Rtd_array = class {
    static get Default() { return []; }
  }
  \$module.ZERO = new BigNumber(0);
  \$module.ONE = new BigNumber(1);
  \$module.NUMBER_LIMIT = new BigNumber(0x20).multipliedBy(0x1000000000000);  // 2^53
  \$module.Tuple = class Tuple extends Array {
    constructor(...elems) {
      super(...elems);
    }
    toString() {
      return "(" + arrayElementsToString(this) + ")";
    }
    equals(other) {
      if (this === other) {
        return true;
      }
      for (let i = 0; i < this.length; i++) {
        if (!_dafny.areEqual(this[i], other[i])) {
          return false;
        }
      }
      return true;
    }
    static Default(...values) {
      return Tuple.of(...values);
    }
    static Rtd(...rtdArgs) {
      return {
        Default: Tuple.from(rtdArgs, rtd => rtd.Default)
      };
    }
  }
  \$module.Set = class Set extends Array {
    constructor() {
      super();
    }
    static get Default() {
      return Set.Empty;
    }
    toString() {
      return "{" + arrayElementsToString(this) + "}";
    }
    static get Empty() {
      if (this._empty === undefined) {
        this._empty = new Set();
      }
      return this._empty;
    }
    static fromElements(...elmts) {
      let s = new Set();
      for (let k of elmts) {
        s.add(k);
      }
      return s;
    }
    contains(k) {
      for (let i = 0; i < this.length; i++) {
        if (_dafny.areEqual(this[i], k)) {
          return true;
        }
      }
      return false;
    }
    add(k) {  // mutates the Set; use only during construction
      if (!this.contains(k)) {
        this.push(k);
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.length !== other.length) {
        return false;
      }
      for (let e of this) {
        if (!other.contains(e)) {
          return false;
        }
      }
      return true;
    }
    get Elements() {
      return this;
    }
    Union(that) {
      if (this.length === 0) {
        return that;
      } else if (that.length === 0) {
        return this;
      } else {
        let s = Set.of(...this);
        for (let k of that) {
          s.add(k);
        }
        return s;
      }
    }
    Intersect(that) {
      if (this.length === 0) {
        return this;
      } else if (that.length === 0) {
        return that;
      } else {
        let s = new Set();
        for (let k of this) {
          if (that.contains(k)) {
            s.push(k);
          }
        }
        return s;
      }
    }
    Difference(that) {
      if (this.length == 0 || that.length == 0) {
        return this;
      } else {
        let s = new Set();
        for (let k of this) {
          if (!that.contains(k)) {
            s.push(k);
          }
        }
        return s;
      }
    }
    IsDisjointFrom(that) {
      for (let k of this) {
        if (that.contains(k)) {
          return false;
        }
      }
      return true;
    }
    IsSubsetOf(that) {
      if (that.length < this.length) {
        return false;
      }
      for (let k of this) {
        if (!that.contains(k)) {
          return false;
        }
      }
      return true;
    }
    IsProperSubsetOf(that) {
      if (that.length <= this.length) {
        return false;
      }
      for (let k of this) {
        if (!that.contains(k)) {
          return false;
        }
      }
      return true;
    }
    get AllSubsets() {
      return this.AllSubsets_();
    }
    *AllSubsets_() {
      // Start by putting all set elements into a list, but don't include null
      let elmts = Array.of(...this);
      let n = elmts.length;
      let which = new Array(n);
      which.fill(false);
      let a = [];
      while (true) {
        yield Set.of(...a);
        // "add 1" to "which", as if doing a carry chain.  For every digit changed, change the membership of the corresponding element in "a".
        let i = 0;
        for (; i < n && which[i]; i++) {
          which[i] = false;
          // remove elmts[i] from a
          for (let j = 0; j < a.length; j++) {
            if (_dafny.areEqual(a[j], elmts[i])) {
              // move the last element of a into slot j
              a[j] = a[-1];
              a.pop();
              break;
            }
          }
        }
        if (i === n) {
          // we have cycled through all the subsets
          break;
        }
        which[i] = true;
        a.push(elmts[i]);
      }
    }
  }
  \$module.MultiSet = class MultiSet extends Array {
    constructor() {
      super();
    }
    static get Default() {
      return MultiSet.Empty;
    }
    toString() {
      let s = "multiset{";
      let sep = "";
      for (let e of this) {
        let [k, n] = e;
        let ks = _dafny.toString(k);
        while (!n.isZero()) {
          n = n.minus(1);
          s += sep + ks;
          sep = ", ";
        }
      }
      s += "}";
      return s;
    }
    static get Empty() {
      if (this._empty === undefined) {
        this._empty = new MultiSet();
      }
      return this._empty;
    }
    static fromElements(...elmts) {
      let s = new MultiSet();
      for (let e of elmts) {
        s.add(e, _dafny.ONE);
      }
      return s;
    }
    static FromArray(arr) {
      let s = new MultiSet();
      for (let e of arr) {
        s.add(e, _dafny.ONE);
      }
      return s;
    }
    cardinality() {
      let c = _dafny.ZERO;
      for (let e of this) {
        let [k, n] = e;
        c = c.plus(n);
      }
      return c;
    }
    clone() {
      let s = new MultiSet();
      for (let e of this) {
        let [k, n] = e;
        s.push([k, n]);  // make sure to create a new array [k, n] here
      }
      return s;
    }
    findIndex(k) {
      for (let i = 0; i < this.length; i++) {
        if (_dafny.areEqual(this[i][0], k)) {
          return i;
        }
      }
      return this.length;
    }
    get(k) {
      let i = this.findIndex(k);
      if (i === this.length) {
        return _dafny.ZERO;
      } else {
        return this[i][1];
      }
    }
    contains(k) {
      return !this.get(k).isZero();
    }
    add(k, n) {
      let i = this.findIndex(k);
      if (i === this.length) {
        this.push([k, n]);
      } else {
        let m = this[i][1];
        this[i] = [k, m.plus(n)];
      }
    }
    update(k, n) {
      let i = this.findIndex(k);
      if (i < this.length && this[i][1].isEqualTo(n)) {
        return this;
      } else if (i === this.length && n.isZero()) {
        return this;
      } else if (i === this.length) {
        let m = this.slice();
        m.push([k, n]);
        return m;
      } else {
        let m = this.slice();
        m[i] = [k, n];
        return m;
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      }
      for (let e of this) {
        let [k, n] = e;
        let m = other.get(k);
        if (!n.isEqualTo(m)) {
          return false;
        }
      }
      return this.cardinality().isEqualTo(other.cardinality());
    }
    get Elements() {
      return this.Elements_();
    }
    *Elements_() {
      for (let i = 0; i < this.length; i++) {
        let [k, n] = this[i];
        while (!n.isZero()) {
          yield k;
          n = n.minus(1);
        }
      }
    }
    get UniqueElements() {
      return this.UniqueElements_();
    }
    *UniqueElements_() {
      for (let e of this) {
        let [k, n] = e;
        if (!n.isZero()) {
          yield k;
        }
      }
    }
    Union(that) {
      if (this.length === 0) {
        return that;
      } else if (that.length === 0) {
        return this;
      } else {
        let s = this.clone();
        for (let e of that) {
          let [k, n] = e;
          s.add(k, n);
        }
        return s;
      }
    }
    Intersect(that) {
      if (this.length === 0) {
        return this;
      } else if (that.length === 0) {
        return that;
      } else {
        let s = new MultiSet();
        for (let e of this) {
          let [k, n] = e;
          let m = that.get(k);
          if (!m.isZero()) {
            s.push([k, m.isLessThan(n) ? m : n]);
          }
        }
        return s;
      }
    }
    Difference(that) {
      if (this.length === 0 || that.length === 0) {
        return this;
      } else {
        let s = new MultiSet();
        for (let e of this) {
          let [k, n] = e;
          let d = n.minus(that.get(k));
          if (d.isGreaterThan(0)) {
            s.push([k, d]);
          }
        }
        return s;
      }
    }
    IsDisjointFrom(that) {
      let intersection = this.Intersect(that);
      return intersection.cardinality().isZero();
    }
    IsSubsetOf(that) {
      for (let e of this) {
        let [k, n] = e;
        let m = that.get(k);
        if (!n.isLessThanOrEqualTo(m)) {
          return false;
        }
      }
      return true;
    }
    IsProperSubsetOf(that) {
      return this.IsSubsetOf(that) && this.cardinality().isLessThan(that.cardinality());
    }
  }
  \$module.CodePoint = class CodePoint {
    constructor(value) {
      this.value = value
    }
    equals(other) {
      if (this === other) {
        return true;
      }
      return this.value === other.value
    }
    isLessThan(other) {
      return this.value < other.value
    }
    isLessThanOrEqual(other) {
      return this.value <= other.value
    }
    toString() {
      return "'" + \$module.escapeCharacter(this) + "'";
    }
    static isCodePoint(i) {
      return (
        (_dafny.ZERO.isLessThanOrEqualTo(i) && i.isLessThan(new BigNumber(0xD800))) ||
        (new BigNumber(0xE000).isLessThanOrEqualTo(i) && i.isLessThan(new BigNumber(0x11_0000))))
    }
  }
  \$module.Seq = class Seq extends Array {
    constructor(...elems) {
      super(...elems);
    }
    static get Default() {
      return Seq.of();
    }
    static Create(n, init) {
      return Seq.from({length: n}, (_, i) => init(new BigNumber(i)));
    }
    static UnicodeFromString(s) {
      return new Seq(...([...s].map(c => new _dafny.CodePoint(c.codePointAt(0)))))
    }
    toString() {
      return "[" + arrayElementsToString(this) + "]";
    }
    toVerbatimString(asLiteral) {
      if (asLiteral) {
        return '"' + this.map(c => _dafny.escapeCharacter(c)).join("") + '"';
      } else {
        return this.map(c => String.fromCodePoint(c.value)).join("");
      }
    }
    static update(s, i, v) {
      if (typeof s === "string") {
        let p = s.slice(0, i);
        let q = s.slice(i.toNumber() + 1);
        return p.concat(v, q);
      } else {
        let t = s.slice();
        t[i] = v;
        return t;
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.length !== other.length) {
        return false;
      }
      for (let i = 0; i < this.length; i++) {
        if (!_dafny.areEqual(this[i], other[i])) {
          return false;
        }
      }
      return true;
    }
    static contains(s, k) {
      if (typeof s === "string") {
        return s.includes(k);
      } else {
        for (let x of s) {
          if (_dafny.areEqual(x, k)) {
            return true;
          }
        }
        return false;
      }
    }
    get Elements() {
      return this;
    }
    get UniqueElements() {
      return _dafny.Set.fromElements(...this);
    }
    static Concat(a, b) {
      if (typeof a === "string" || typeof b === "string") {
        // string concatenation, so make sure both operands are strings before concatenating
        if (typeof a !== "string") {
          // a must be a Seq
          a = a.join("");
        }
        if (typeof b !== "string") {
          // b must be a Seq
          b = b.join("");
        }
        return a + b;
      } else {
        // ordinary concatenation
        let r = Seq.of(...a);
        r.push(...b);
        return r;
      }
    }
    static JoinIfPossible(x) {
      try { return x.join(""); } catch(_error) { return x; }
    }
    static IsPrefixOf(a, b) {
      if (b.length < a.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!_dafny.areEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
    static IsProperPrefixOf(a, b) {
      if (b.length <= a.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!_dafny.areEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }
  }
  \$module.Map = class Map extends Array {
    constructor() {
      super();
    }
    static get Default() {
      return Map.of();
    }
    toString() {
      return "map[" + this.map(maplet => _dafny.toString(maplet[0]) + " := " + _dafny.toString(maplet[1])).join(", ") + "]";
    }
    static get Empty() {
      if (this._empty === undefined) {
        this._empty = new Map();
      }
      return this._empty;
    }
    findIndex(k) {
      for (let i = 0; i < this.length; i++) {
        if (_dafny.areEqual(this[i][0], k)) {
          return i;
        }
      }
      return this.length;
    }
    get(k) {
      let i = this.findIndex(k);
      if (i === this.length) {
        return undefined;
      } else {
        return this[i][1];
      }
    }
    contains(k) {
      return this.findIndex(k) < this.length;
    }
    update(k, v) {
      let m = this.slice();
      m.updateUnsafe(k, v);
      return m;
    }
    // Similar to update, but make the modification in-place.
    // Meant to be used in the map constructor.
    updateUnsafe(k, v) {
      let m = this;
      let i = m.findIndex(k);
      m[i] = [k, v];
      return m;
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.length !== other.length) {
        return false;
      }
      for (let e of this) {
        let [k, v] = e;
        let w = other.get(k);
        if (w === undefined || !_dafny.areEqual(v, w)) {
          return false;
        }
      }
      return true;
    }
    get Keys() {
      let s = new _dafny.Set();
      for (let e of this) {
        let [k, v] = e;
        s.push(k);
      }
      return s;
    }
    get Values() {
      let s = new _dafny.Set();
      for (let e of this) {
        let [k, v] = e;
        s.add(v);
      }
      return s;
    }
    get Items() {
      let s = new _dafny.Set();
      for (let e of this) {
        let [k, v] = e;
        s.push(_dafny.Tuple.of(k, v));
      }
      return s;
    }
    Merge(that) {
      let m = that.slice();
      for (let e of this) {
        let [k, v] = e;
        let i = m.findIndex(k);
        if (i == m.length) {
          m[i] = [k, v];
        }
      }
      return m;
    }
    Subtract(keys) {
      if (this.length === 0 || keys.length === 0) {
        return this;
      }
      let m = new Map();
      for (let e of this) {
        let [k, v] = e;
        if (!keys.contains(k)) {
          m[m.length] = e;
        }
      }
      return m;
    }
  }
  \$module.newArray = function(initValue, ...dims) {
    return { dims: dims, elmts: buildArray(initValue, ...dims) };
  }
  \$module.BigOrdinal = class BigOrdinal {
    static get Default() {
      return _dafny.ZERO;
    }
    static IsLimit(ord) {
      return ord.isZero();
    }
    static IsSucc(ord) {
      return ord.isGreaterThan(0);
    }
    static Offset(ord) {
      return ord;
    }
    static IsNat(ord) {
      return true;  // at run time, every ORDINAL is a natural number
    }
  }
  \$module.BigRational = class BigRational {
    static get ZERO() {
      if (this._zero === undefined) {
        this._zero = new BigRational(_dafny.ZERO);
      }
      return this._zero;
    }
    constructor (n, d) {
      // requires d === undefined || 1 <= d
      this.num = n;
      this.den = d === undefined ? _dafny.ONE : d;
      // invariant 1 <= den || (num == 0 && den == 0)
    }
    static get Default() {
      return _dafny.BigRational.ZERO;
    }
    // We need to deal with the special case \`num == 0 && den == 0\`, because
    // that's what C#'s default struct constructor will produce for BigRational. :(
    // To deal with it, we ignore \`den\` when \`num\` is 0.
    toString() {
      if (this.num.isZero() || this.den.isEqualTo(1)) {
        return this.num.toFixed() + ".0";
      }
      let answer = this.dividesAPowerOf10(this.den);
      if (answer !== undefined) {
        let n = this.num.multipliedBy(answer[0]);
        let log10 = answer[1];
        let sign, digits;
        if (this.num.isLessThan(0)) {
          sign = "-"; digits = n.negated().toFixed();
        } else {
          sign = ""; digits = n.toFixed();
        }
        if (log10 < digits.length) {
          let digitCount = digits.length - log10;
          return sign + digits.slice(0, digitCount) + "." + digits.slice(digitCount);
        } else {
          return sign + "0." + "0".repeat(log10 - digits.length) + digits;
        }
      } else {
        return "(" + this.num.toFixed() + ".0 / " + this.den.toFixed() + ".0)";
      }
    }
    isPowerOf10(x) {
      if (x.isZero()) {
        return undefined;
      }
      let log10 = 0;
      while (true) {  // invariant: x != 0 && x * 10^log10 == old(x)
        if (x.isEqualTo(1)) {
          return log10;
        } else if (x.mod(10).isZero()) {
          log10++;
          x = x.dividedToIntegerBy(10);
        } else {
          return undefined;
        }
      }
    }
    dividesAPowerOf10(i) {
      let factor = _dafny.ONE;
      let log10 = 0;
      if (i.isLessThanOrEqualTo(_dafny.ZERO)) {
        return undefined;
      }

      // invariant: 1 <= i && i * 10^log10 == factor * old(i)
      while (i.mod(10).isZero()) {
        i = i.dividedToIntegerBy(10);
       log10++;
      }

      while (i.mod(5).isZero()) {
        i = i.dividedToIntegerBy(5);
        factor = factor.multipliedBy(2);
        log10++;
      }
      while (i.mod(2).isZero()) {
        i = i.dividedToIntegerBy(2);
        factor = factor.multipliedBy(5);
        log10++;
      }

      if (i.isEqualTo(_dafny.ONE)) {
        return [factor, log10];
      } else {
        return undefined;
      }
    }
    toBigNumber() {
      if (this.num.isZero() || this.den.isEqualTo(1)) {
        return this.num;
      } else if (this.num.isGreaterThan(0)) {
        return this.num.dividedToIntegerBy(this.den);
      } else {
        return this.num.minus(this.den).plus(1).dividedToIntegerBy(this.den);
      }
    }
    isInteger() {
      return this.equals(new _dafny.BigRational(this.toBigNumber(), _dafny.ONE));
    }
    // Returns values such that aa/dd == a and bb/dd == b.
    normalize(b) {
      let a = this;
      let aa, bb, dd;
      if (a.num.isZero()) {
        aa = a.num;
        bb = b.num;
        dd = b.den;
      } else if (b.num.isZero()) {
        aa = a.num;
        dd = a.den;
        bb = b.num;
      } else {
        let gcd = BigNumberGcd(a.den, b.den);
        let xx = a.den.dividedToIntegerBy(gcd);
        let yy = b.den.dividedToIntegerBy(gcd);
        // We now have a == a.num / (xx * gcd) and b == b.num / (yy * gcd).
        aa = a.num.multipliedBy(yy);
        bb = b.num.multipliedBy(xx);
        dd = a.den.multipliedBy(yy);
      }
      return [aa, bb, dd];
    }
    compareTo(that) {
      // simple things first
      let asign = this.num.isZero() ? 0 : this.num.isLessThan(0) ? -1 : 1;
      let bsign = that.num.isZero() ? 0 : that.num.isLessThan(0) ? -1 : 1;
      if (asign < 0 && 0 <= bsign) {
        return -1;
      } else if (asign <= 0 && 0 < bsign) {
        return -1;
      } else if (bsign < 0 && 0 <= asign) {
        return 1;
      } else if (bsign <= 0 && 0 < asign) {
        return 1;
      }
      let [aa, bb, dd] = this.normalize(that);
      if (aa.isLessThan(bb)) {
        return -1;
      } else if (aa.isEqualTo(bb)){
        return 0;
      } else {
        return 1;
      }
    }
    equals(that) {
      return this.compareTo(that) === 0;
    }
    isLessThan(that) {
      return this.compareTo(that) < 0;
    }
    isAtMost(that) {
      return this.compareTo(that) <= 0;
    }
    plus(b) {
      let [aa, bb, dd] = this.normalize(b);
      return new BigRational(aa.plus(bb), dd);
    }
    minus(b) {
      let [aa, bb, dd] = this.normalize(b);
      return new BigRational(aa.minus(bb), dd);
    }
    negated() {
      return new BigRational(this.num.negated(), this.den);
    }
    multipliedBy(b) {
      return new BigRational(this.num.multipliedBy(b.num), this.den.multipliedBy(b.den));
    }
    dividedBy(b) {
      let a = this;
      // Compute the reciprocal of b
      let bReciprocal;
      if (b.num.isGreaterThan(0)) {
        bReciprocal = new BigRational(b.den, b.num);
      } else {
        // this is the case b.num < 0
        bReciprocal = new BigRational(b.den.negated(), b.num.negated());
      }
      return a.multipliedBy(bReciprocal);
    }
  }
  \$module.EuclideanDivisionNumber = function(a, b) {
    if (0 <= a) {
      if (0 <= b) {
        // +a +b: a/b
        return Math.floor(a / b);
      } else {
        // +a -b: -(a/(-b))
        return -Math.floor(a / -b);
      }
    } else {
      if (0 <= b) {
        // -a +b: -((-a-1)/b) - 1
        return -Math.floor((-a-1) / b) - 1;
      } else {
        // -a -b: ((-a-1)/(-b)) + 1
        return Math.floor((-a-1) / -b) + 1;
      }
    }
  }
  \$module.EuclideanDivision = function(a, b) {
    if (a.isGreaterThanOrEqualTo(0)) {
      if (b.isGreaterThanOrEqualTo(0)) {
        // +a +b: a/b
        return a.dividedToIntegerBy(b);
      } else {
        // +a -b: -(a/(-b))
        return a.dividedToIntegerBy(b.negated()).negated();
      }
    } else {
      if (b.isGreaterThanOrEqualTo(0)) {
        // -a +b: -((-a-1)/b) - 1
        return a.negated().minus(1).dividedToIntegerBy(b).negated().minus(1);
      } else {
        // -a -b: ((-a-1)/(-b)) + 1
        return a.negated().minus(1).dividedToIntegerBy(b.negated()).plus(1);
      }
    }
  }
  \$module.EuclideanModuloNumber = function(a, b) {
    let bp = Math.abs(b);
    if (0 <= a) {
      // +a: a % bp
      return a % bp;
    } else {
      // c = ((-a) % bp)
      // -a: bp - c if c > 0
      // -a: 0 if c == 0
      let c = (-a) % bp;
      return c === 0 ? c : bp - c;
    }
  }
  \$module.ShiftLeft = function(b, n) {
    return b.multipliedBy(new BigNumber(2).exponentiatedBy(n));
  }
  \$module.ShiftRight = function(b, n) {
    return b.dividedToIntegerBy(new BigNumber(2).exponentiatedBy(n));
  }
  \$module.RotateLeft = function(b, n, w) {  // truncate(b << n) | (b >> (w - n))
    let x = _dafny.ShiftLeft(b, n).mod(new BigNumber(2).exponentiatedBy(w));
    let y = _dafny.ShiftRight(b, w - n);
    return x.plus(y);
  }
  \$module.RotateRight = function(b, n, w) {  // (b >> n) | truncate(b << (w - n))
    let x = _dafny.ShiftRight(b, n);
    let y = _dafny.ShiftLeft(b, w - n).mod(new BigNumber(2).exponentiatedBy(w));;
    return x.plus(y);
  }
  \$module.BitwiseAnd = function(a, b) {
    let r = _dafny.ZERO;
    const m = _dafny.NUMBER_LIMIT;  // 2^53
    let h = _dafny.ONE;
    while (!a.isZero() && !b.isZero()) {
      let a0 = a.mod(m);
      let b0 = b.mod(m);
      r = r.plus(h.multipliedBy(a0 & b0));
      a = a.dividedToIntegerBy(m);
      b = b.dividedToIntegerBy(m);
      h = h.multipliedBy(m);
    }
    return r;
  }
  \$module.BitwiseOr = function(a, b) {
    let r = _dafny.ZERO;
    const m = _dafny.NUMBER_LIMIT;  // 2^53
    let h = _dafny.ONE;
    while (!a.isZero() && !b.isZero()) {
      let a0 = a.mod(m);
      let b0 = b.mod(m);
      r = r.plus(h.multipliedBy(a0 | b0));
      a = a.dividedToIntegerBy(m);
      b = b.dividedToIntegerBy(m);
      h = h.multipliedBy(m);
    }
    r = r.plus(h.multipliedBy(a | b));
    return r;
  }
  \$module.BitwiseXor = function(a, b) {
    let r = _dafny.ZERO;
    const m = _dafny.NUMBER_LIMIT;  // 2^53
    let h = _dafny.ONE;
    while (!a.isZero() && !b.isZero()) {
      let a0 = a.mod(m);
      let b0 = b.mod(m);
      r = r.plus(h.multipliedBy(a0 ^ b0));
      a = a.dividedToIntegerBy(m);
      b = b.dividedToIntegerBy(m);
      h = h.multipliedBy(m);
    }
    r = r.plus(h.multipliedBy(a | b));
    return r;
  }
  \$module.BitwiseNot = function(a, bits) {
    let r = _dafny.ZERO;
    let h = _dafny.ONE;
    for (let i = 0; i < bits; i++) {
      let bit = a.mod(2);
      if (bit.isZero()) {
        r = r.plus(h);
      }
      a = a.dividedToIntegerBy(2);
      h = h.multipliedBy(2);
    }
    return r;
  }
  \$module.Quantifier = function(vals, frall, pred) {
    for (let u of vals) {
      if (pred(u) !== frall) { return !frall; }
    }
    return frall;
  }
  \$module.PlusChar = function(a, b) {
    return String.fromCharCode(a.charCodeAt(0) + b.charCodeAt(0));
  }
  \$module.UnicodePlusChar = function(a, b) {
    return new _dafny.CodePoint(a.value + b.value);
  }
  \$module.MinusChar = function(a, b) {
    return String.fromCharCode(a.charCodeAt(0) - b.charCodeAt(0));
  }
  \$module.UnicodeMinusChar = function(a, b) {
    return new _dafny.CodePoint(a.value - b.value);
  }
  \$module.AllBooleans = function*() {
    yield false;
    yield true;
  }
  \$module.AllChars = function*() {
    for (let i = 0; i < 0x10000; i++) {
      yield String.fromCharCode(i);
    }
  }
  \$module.AllUnicodeChars = function*() {
    for (let i = 0; i < 0xD800; i++) {
      yield new _dafny.CodePoint(i);
    }
    for (let i = 0xE0000; i < 0x110000; i++) {
      yield new _dafny.CodePoint(i);
    }
  }
  \$module.AllIntegers = function*() {
    yield _dafny.ZERO;
    for (let j = _dafny.ONE;; j = j.plus(1)) {
      yield j;
      yield j.negated();
    }
  }
  \$module.IntegerRange = function*(lo, hi) {
    if (lo === null) {
      while (true) {
        hi = hi.minus(1);
        yield hi;
      }
    } else if (hi === null) {
      while (true) {
        yield lo;
        lo = lo.plus(1);
      }
    } else {
      while (lo.isLessThan(hi)) {
        yield lo;
        lo = lo.plus(1);
      }
    }
  }
  \$module.SingleValue = function*(v) {
    yield v;
  }
  \$module.HaltException = class HaltException extends Error {
    constructor(message) {
      super(message)
    }
  }
  \$module.HandleHaltExceptions = function(f) {
    try {
      f()
    } catch (e) {
      if (e instanceof _dafny.HaltException) {
        process.stdout.write("[Program halted] " + e.message + "\\n")
        process.exitCode = 1
      } else {
        throw e
      }
    }
  }
  \$module.FromMainArguments = function(args) {
    var a = [...args];
    a.splice(0, 2, args[0] + " " + args[1]);
    return a;
  }
  \$module.UnicodeFromMainArguments = function(args) {
    return \$module.FromMainArguments(args).map(_dafny.Seq.UnicodeFromString);
  }
  return \$module;

  // What follows are routines private to the Dafny runtime
  function buildArray(initValue, ...dims) {
    if (dims.length === 0) {
      return initValue;
    } else {
      let a = Array(dims[0].toNumber());
      let b = Array.from(a, (x) => buildArray(initValue, ...dims.slice(1)));
      return b;
    }
  }
  function arrayElementsToString(a) {
    // like \`a.join(", ")\`, but calling _dafny.toString(x) on every element x instead of x.toString()
    let s = "";
    let sep = "";
    for (let x of a) {
      s += sep + _dafny.toString(x);
      sep = ", ";
    }
    return s;
  }
  function BigNumberGcd(a, b){  // gcd of two non-negative BigNumber's
    while (true) {
      if (a.isZero()) {
        return b;
      } else if (b.isZero()) {
        return a;
      }
      if (a.isLessThan(b)) {
        b = b.modulo(a);
      } else {
        a = a.modulo(b);
      }
    }
  }
})();
// Dafny program systemModulePopulator.dfy compiled into JavaScript
let _System = (function() {
  let \$module = {};

  \$module.nat = class nat {
    constructor () {
    }
    static get Default() {
      return _dafny.ZERO;
    }
    static _Is(__source) {
      let _0_x = (__source);
      return (_dafny.ZERO).isLessThanOrEqualTo(_0_x);
    }
  };

  return \$module;
})(); // end of module _System
let KanbanDomain = (function() {
  let \$module = {};

  \$module.__default = class __default {
    constructor () {
      this._tname = "KanbanDomain._default";
    }
    _parentTraits() {
      return [];
    }
    static RejectErr() {
      return KanbanDomain.Err.create_Rejected();
    };
    static NoDupSeq(s) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((s).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return _dafny.Quantifier(_dafny.IntegerRange((_0_i).plus(_dafny.ONE), new BigNumber((s).length)), true, function (_forall_var_1) {
          let _1_j = _forall_var_1;
          return !((((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(_1_j))) && ((_1_j).isLessThan(new BigNumber((s).length)))) || (!_dafny.areEqual((s)[_0_i], (s)[_1_j]));
        });
      });
    };
    static AllIds(m) {
      return KanbanDomain.__default.AllIdsHelper((m).dtor_cols, (m).dtor_lanes);
    };
    static AllIdsHelper(cols, lanes) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cols).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of());
        } else {
          let _1_c = (cols)[_dafny.ZERO];
          let _2_lane = (((lanes).contains(_1_c)) ? ((lanes).get(_1_c)) : (_dafny.Seq.of()));
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, _2_lane);
          let _in0 = (cols).slice(_dafny.ONE);
          let _in1 = lanes;
          cols = _in0;
          lanes = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static OccursInLanes(m, id) {
      return _dafny.Quantifier(((m).dtor_lanes).Keys.Elements, false, function (_exists_var_0) {
        let _0_c = _exists_var_0;
        return (((m).dtor_lanes).contains(_0_c)) && (KanbanDomain.__default.SeqContains(((m).dtor_lanes).get(_0_c), id));
      });
    };
    static CountInLanes(m, id) {
      return KanbanDomain.__default.CountInLanesHelper((m).dtor_cols, (m).dtor_lanes, id);
    };
    static CountInLanesHelper(cols, lanes, id) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cols).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          let _1_c = (cols)[_dafny.ZERO];
          let _2_lane = (((lanes).contains(_1_c)) ? ((lanes).get(_1_c)) : (_dafny.Seq.of()));
          let _3_here = ((KanbanDomain.__default.SeqContains(_2_lane, id)) ? (_dafny.ONE) : (_dafny.ZERO));
          _0___accumulator = (_0___accumulator).plus(_3_here);
          let _in0 = (cols).slice(_dafny.ONE);
          let _in1 = lanes;
          let _in2 = id;
          cols = _in0;
          lanes = _in1;
          id = _in2;
          continue TAIL_CALL_START;
        }
      }
    };
    static Init() {
      return KanbanDomain.Model.create_Model(_dafny.Seq.of(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.ZERO);
    };
    static Get(mp, k, d) {
      if ((mp).contains(k)) {
        return (mp).get(k);
      } else {
        return d;
      }
    };
    static Lane(m, c) {
      return KanbanDomain.__default.Get((m).dtor_lanes, c, _dafny.Seq.of());
    };
    static Wip(m, c) {
      return KanbanDomain.__default.Get((m).dtor_wip, c, _dafny.ZERO);
    };
    static SeqContains(s, x) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((s).length)), false, function (_exists_var_0) {
        let _0_i = _exists_var_0;
        return (((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((s).length)))) && (_dafny.areEqual((s)[_0_i], x));
      });
    };
    static RemoveFirst(s, x) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((s).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of());
        } else if (_dafny.areEqual((s)[_dafny.ZERO], x)) {
          return _dafny.Seq.Concat(_0___accumulator, (s).slice(_dafny.ONE));
        } else {
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of((s)[_dafny.ZERO]));
          let _in0 = (s).slice(_dafny.ONE);
          let _in1 = x;
          s = _in0;
          x = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static InsertAt(s, i, x) {
      return _dafny.Seq.Concat(_dafny.Seq.Concat((s).slice(0, i), _dafny.Seq.of(x)), (s).slice(i));
    };
    static IndexOf(s, x) {
      if ((new BigNumber((s).length)).isEqualTo(_dafny.ZERO)) {
        return new BigNumber(-1);
      } else if (_dafny.areEqual((s)[_dafny.ZERO], x)) {
        return _dafny.ZERO;
      } else {
        let _0_j = KanbanDomain.__default.IndexOf((s).slice(_dafny.ONE), x);
        if ((_0_j).isLessThan(_dafny.ZERO)) {
          return new BigNumber(-1);
        } else {
          return (_0_j).plus(_dafny.ONE);
        }
      }
    };
    static ClampPos(pos, n) {
      if ((pos).isLessThanOrEqualTo(_dafny.ZERO)) {
        return _dafny.ZERO;
      } else if ((n).isLessThanOrEqualTo(pos)) {
        return (n);
      } else {
        return (pos);
      }
    };
    static PosFromPlace(lane, p) {
      let _source0 = p;
      {
        if (_source0.is_AtEnd) {
          return new BigNumber((lane).length);
        }
      }
      {
        if (_source0.is_Before) {
          let _0_a = (_source0).anchor;
          let _1_i = KanbanDomain.__default.IndexOf(lane, _0_a);
          if ((_1_i).isLessThan(_dafny.ZERO)) {
            return new BigNumber(-1);
          } else {
            return _1_i;
          }
        }
      }
      {
        let _2_a = (_source0).anchor;
        let _3_i = KanbanDomain.__default.IndexOf(lane, _2_a);
        if ((_3_i).isLessThan(_dafny.ZERO)) {
          return new BigNumber(-1);
        } else {
          return (_3_i).plus(_dafny.ONE);
        }
      }
    };
    static TryStep(m, a) {
      let _source0 = a;
      {
        if (_source0.is_NoOp) {
          return KanbanDomain.Result.create_Ok(m);
        }
      }
      {
        if (_source0.is_AddColumn) {
          let _0_col = (_source0).col;
          let _1_limit = (_source0).limit;
          if (_dafny.Seq.contains((m).dtor_cols, _0_col)) {
            return KanbanDomain.Result.create_Ok(m);
          } else {
            return KanbanDomain.Result.create_Ok(KanbanDomain.Model.create_Model(_dafny.Seq.Concat((m).dtor_cols, _dafny.Seq.of(_0_col)), ((m).dtor_lanes).update(_0_col, _dafny.Seq.of()), ((m).dtor_wip).update(_0_col, _1_limit), (m).dtor_cards, (m).dtor_nextId));
          }
        }
      }
      {
        if (_source0.is_SetWip) {
          let _2_col = (_source0).col;
          let _3_limit = (_source0).limit;
          if (!(_dafny.Seq.contains((m).dtor_cols, _2_col))) {
            return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_MissingColumn());
          } else if ((_3_limit).isLessThan(new BigNumber((KanbanDomain.__default.Lane(m, _2_col)).length))) {
            return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_WipExceeded());
          } else {
            return KanbanDomain.Result.create_Ok(KanbanDomain.Model.create_Model((m).dtor_cols, (m).dtor_lanes, ((m).dtor_wip).update(_2_col, _3_limit), (m).dtor_cards, (m).dtor_nextId));
          }
        }
      }
      {
        if (_source0.is_AddCard) {
          let _4_col = (_source0).col;
          let _5_title = (_source0).title;
          if (!(_dafny.Seq.contains((m).dtor_cols, _4_col))) {
            return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_MissingColumn());
          } else if ((KanbanDomain.__default.Wip(m, _4_col)).isLessThan((new BigNumber((KanbanDomain.__default.Lane(m, _4_col)).length)).plus(_dafny.ONE))) {
            return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_WipExceeded());
          } else {
            let _6_id = (m).dtor_nextId;
            return KanbanDomain.Result.create_Ok(KanbanDomain.Model.create_Model((m).dtor_cols, ((m).dtor_lanes).update(_4_col, _dafny.Seq.Concat(KanbanDomain.__default.Lane(m, _4_col), _dafny.Seq.of(_6_id))), (m).dtor_wip, ((m).dtor_cards).update(_6_id, _5_title), ((m).dtor_nextId).plus(_dafny.ONE)));
          }
        }
      }
      {
        if (_source0.is_EditTitle) {
          let _7_id = (_source0).id;
          let _8_title = (_source0).title;
          if (!(((m).dtor_cards).contains(_7_id))) {
            return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_MissingCard());
          } else {
            return KanbanDomain.Result.create_Ok(KanbanDomain.Model.create_Model((m).dtor_cols, (m).dtor_lanes, (m).dtor_wip, ((m).dtor_cards).update(_7_id, _8_title), (m).dtor_nextId));
          }
        }
      }
      {
        let _9_id = (_source0).id;
        let _10_toCol = (_source0).toCol;
        let _11_place = (_source0).place;
        if (!(((m).dtor_cards).contains(_9_id))) {
          return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_MissingCard());
        } else if (!(_dafny.Seq.contains((m).dtor_cols, _10_toCol))) {
          return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_MissingColumn());
        } else if ((KanbanDomain.__default.Wip(m, _10_toCol)).isLessThan((new BigNumber((KanbanDomain.__default.Lane(m, _10_toCol)).length)).plus(((KanbanDomain.__default.SeqContains(KanbanDomain.__default.Lane(m, _10_toCol), _9_id)) ? (_dafny.ZERO) : (_dafny.ONE))))) {
          return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_WipExceeded());
        } else {
          let _12_lanes1 = function () {
            let _coll0 = new _dafny.Map();
            for (const _compr_0 of ((m).dtor_lanes).Keys.Elements) {
              let _13_c = _compr_0;
              if (((m).dtor_lanes).contains(_13_c)) {
                _coll0.push([_13_c,KanbanDomain.__default.RemoveFirst(((m).dtor_lanes).get(_13_c), _9_id)]);
              }
            }
            return _coll0;
          }();
          let _14_tgt = KanbanDomain.__default.Get(_12_lanes1, _10_toCol, _dafny.Seq.of());
          let _15_pos = KanbanDomain.__default.PosFromPlace(_14_tgt, _11_place);
          if ((_15_pos).isLessThan(_dafny.ZERO)) {
            return KanbanDomain.Result.create_Err(KanbanDomain.Err.create_BadAnchor());
          } else {
            let _16_k = KanbanDomain.__default.ClampPos(_15_pos, new BigNumber((_14_tgt).length));
            let _17_tgt2 = KanbanDomain.__default.InsertAt(_14_tgt, _16_k, _9_id);
            return KanbanDomain.Result.create_Ok(KanbanDomain.Model.create_Model((m).dtor_cols, (_12_lanes1).update(_10_toCol, _17_tgt2), (m).dtor_wip, (m).dtor_cards, (m).dtor_nextId));
          }
        }
      }
    };
    static PlaceAnchor(p) {
      let _source0 = p;
      {
        if (_source0.is_AtEnd) {
          return KanbanDomain.Option.create_None();
        }
      }
      {
        if (_source0.is_Before) {
          let _0_a = (_source0).anchor;
          return KanbanDomain.Option.create_Some(_0_a);
        }
      }
      {
        let _1_a = (_source0).anchor;
        return KanbanDomain.Option.create_Some(_1_a);
      }
    };
    static DegradeIfAnchorMoved(movedId, p) {
      let _source0 = p;
      {
        if (_source0.is_AtEnd) {
          return KanbanDomain.Place.create_AtEnd();
        }
      }
      {
        if (_source0.is_Before) {
          let _0_a = (_source0).anchor;
          if ((_0_a).isEqualTo(movedId)) {
            return KanbanDomain.Place.create_AtEnd();
          } else {
            return p;
          }
        }
      }
      {
        let _1_a = (_source0).anchor;
        if ((_1_a).isEqualTo(movedId)) {
          return KanbanDomain.Place.create_AtEnd();
        } else {
          return p;
        }
      }
    };
    static Rebase(remote, local) {
      let _source0 = _dafny.Tuple.of(remote, local);
      {
        let _00 = (_source0)[0];
        if (_00.is_NoOp) {
          return local;
        }
      }
      {
        let _10 = (_source0)[1];
        if (_10.is_NoOp) {
          return KanbanDomain.Action.create_NoOp();
        }
      }
      {
        let _01 = (_source0)[0];
        if (_01.is_MoveCard) {
          let _0_rid = (_01).id;
          let _11 = (_source0)[1];
          if (_11.is_MoveCard) {
            let _1_lid = (_11).id;
            let _2_ltoCol = (_11).toCol;
            let _3_lplace = (_11).place;
            if ((_0_rid).isEqualTo(_1_lid)) {
              return local;
            } else {
              return KanbanDomain.Action.create_MoveCard(_1_lid, _2_ltoCol, KanbanDomain.__default.DegradeIfAnchorMoved(_0_rid, _3_lplace));
            }
          }
        }
      }
      {
        let _02 = (_source0)[0];
        if (_02.is_EditTitle) {
          let _12 = (_source0)[1];
          if (_12.is_EditTitle) {
            return local;
          }
        }
      }
      {
        let _03 = (_source0)[0];
        if (_03.is_MoveCard) {
          let _4_rid = (_03).id;
          return local;
        }
      }
      {
        let _04 = (_source0)[0];
        if (_04.is_AddColumn) {
          return local;
        }
      }
      {
        let _05 = (_source0)[0];
        if (_05.is_SetWip) {
          return local;
        }
      }
      {
        let _06 = (_source0)[0];
        if (_06.is_AddCard) {
          return local;
        }
      }
      {
        let _07 = (_source0)[0];
        return local;
      }
    };
    static Candidates(m, a) {
      let _source0 = a;
      {
        if (_source0.is_MoveCard) {
          let _0_id = (_source0).id;
          let _1_toCol = (_source0).toCol;
          let _2_place = (_source0).place;
          let _3_lane = KanbanDomain.__default.Lane(m, _1_toCol);
          if (_dafny.areEqual(_2_place, KanbanDomain.Place.create_AtEnd())) {
            return _dafny.Seq.of(KanbanDomain.Action.create_MoveCard(_0_id, _1_toCol, KanbanDomain.Place.create_AtEnd()));
          } else if ((new BigNumber((_3_lane).length)).isEqualTo(_dafny.ZERO)) {
            return _dafny.Seq.of(KanbanDomain.Action.create_MoveCard(_0_id, _1_toCol, _2_place), KanbanDomain.Action.create_MoveCard(_0_id, _1_toCol, KanbanDomain.Place.create_AtEnd()));
          } else {
            let _4_first = (_3_lane)[_dafny.ZERO];
            return _dafny.Seq.of(KanbanDomain.Action.create_MoveCard(_0_id, _1_toCol, _2_place), KanbanDomain.Action.create_MoveCard(_0_id, _1_toCol, KanbanDomain.Place.create_AtEnd()), KanbanDomain.Action.create_MoveCard(_0_id, _1_toCol, KanbanDomain.Place.create_Before(_4_first)));
          }
        }
      }
      {
        return _dafny.Seq.of(a);
      }
    };
    static RebaseThroughSuffix(suffix, a) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((suffix).length)).isEqualTo(_dafny.ZERO)) {
          return a;
        } else {
          let _in0 = (suffix).slice(0, (new BigNumber((suffix).length)).minus(_dafny.ONE));
          let _in1 = KanbanDomain.__default.Rebase((suffix)[(new BigNumber((suffix).length)).minus(_dafny.ONE)], a);
          suffix = _in0;
          a = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
  };

  \$module.Card = class Card {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Card(title) {
      let \$dt = new Card(0);
      \$dt.title = title;
      return \$dt;
    }
    get is_Card() { return this.\$tag === 0; }
    get dtor_title() { return this.title; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Card.Card" + "(" + this.title.toVerbatimString(true) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.title, other.title);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return _dafny.Seq.UnicodeFromString("");
    }
    static Rtd() {
      return class {
        static get Default() {
          return Card.Default();
        }
      };
    }
  }

  \$module.Model = class Model {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Model(cols, lanes, wip, cards, nextId) {
      let \$dt = new Model(0);
      \$dt.cols = cols;
      \$dt.lanes = lanes;
      \$dt.wip = wip;
      \$dt.cards = cards;
      \$dt.nextId = nextId;
      return \$dt;
    }
    get is_Model() { return this.\$tag === 0; }
    get dtor_cols() { return this.cols; }
    get dtor_lanes() { return this.lanes; }
    get dtor_wip() { return this.wip; }
    get dtor_cards() { return this.cards; }
    get dtor_nextId() { return this.nextId; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Model.Model" + "(" + _dafny.toString(this.cols) + ", " + _dafny.toString(this.lanes) + ", " + _dafny.toString(this.wip) + ", " + _dafny.toString(this.cards) + ", " + _dafny.toString(this.nextId) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.cols, other.cols) && _dafny.areEqual(this.lanes, other.lanes) && _dafny.areEqual(this.wip, other.wip) && _dafny.areEqual(this.cards, other.cards) && _dafny.areEqual(this.nextId, other.nextId);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanDomain.Model.create_Model(_dafny.Seq.of(), _dafny.Map.Empty, _dafny.Map.Empty, _dafny.Map.Empty, _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Model.Default();
        }
      };
    }
  }

  \$module.Err = class Err {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_MissingColumn() {
      let \$dt = new Err(0);
      return \$dt;
    }
    static create_MissingCard() {
      let \$dt = new Err(1);
      return \$dt;
    }
    static create_WipExceeded() {
      let \$dt = new Err(2);
      return \$dt;
    }
    static create_BadAnchor() {
      let \$dt = new Err(3);
      return \$dt;
    }
    static create_Rejected() {
      let \$dt = new Err(4);
      return \$dt;
    }
    get is_MissingColumn() { return this.\$tag === 0; }
    get is_MissingCard() { return this.\$tag === 1; }
    get is_WipExceeded() { return this.\$tag === 2; }
    get is_BadAnchor() { return this.\$tag === 3; }
    get is_Rejected() { return this.\$tag === 4; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Err.create_MissingColumn();
      yield Err.create_MissingCard();
      yield Err.create_WipExceeded();
      yield Err.create_BadAnchor();
      yield Err.create_Rejected();
    }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Err.MissingColumn";
      } else if (this.\$tag === 1) {
        return "KanbanDomain.Err.MissingCard";
      } else if (this.\$tag === 2) {
        return "KanbanDomain.Err.WipExceeded";
      } else if (this.\$tag === 3) {
        return "KanbanDomain.Err.BadAnchor";
      } else if (this.\$tag === 4) {
        return "KanbanDomain.Err.Rejected";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0;
      } else if (this.\$tag === 1) {
        return other.\$tag === 1;
      } else if (this.\$tag === 2) {
        return other.\$tag === 2;
      } else if (this.\$tag === 3) {
        return other.\$tag === 3;
      } else if (this.\$tag === 4) {
        return other.\$tag === 4;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanDomain.Err.create_MissingColumn();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Err.Default();
        }
      };
    }
  }

  \$module.Option = class Option {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_None() {
      let \$dt = new Option(0);
      return \$dt;
    }
    static create_Some(value) {
      let \$dt = new Option(1);
      \$dt.value = value;
      return \$dt;
    }
    get is_None() { return this.\$tag === 0; }
    get is_Some() { return this.\$tag === 1; }
    get dtor_value() { return this.value; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Option.None";
      } else if (this.\$tag === 1) {
        return "KanbanDomain.Option.Some" + "(" + _dafny.toString(this.value) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0;
      } else if (this.\$tag === 1) {
        return other.\$tag === 1 && _dafny.areEqual(this.value, other.value);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanDomain.Option.create_None();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Option.Default();
        }
      };
    }
  }

  \$module.Place = class Place {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_AtEnd() {
      let \$dt = new Place(0);
      return \$dt;
    }
    static create_Before(anchor) {
      let \$dt = new Place(1);
      \$dt.anchor = anchor;
      return \$dt;
    }
    static create_After(anchor) {
      let \$dt = new Place(2);
      \$dt.anchor = anchor;
      return \$dt;
    }
    get is_AtEnd() { return this.\$tag === 0; }
    get is_Before() { return this.\$tag === 1; }
    get is_After() { return this.\$tag === 2; }
    get dtor_anchor() { return this.anchor; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Place.AtEnd";
      } else if (this.\$tag === 1) {
        return "KanbanDomain.Place.Before" + "(" + _dafny.toString(this.anchor) + ")";
      } else if (this.\$tag === 2) {
        return "KanbanDomain.Place.After" + "(" + _dafny.toString(this.anchor) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0;
      } else if (this.\$tag === 1) {
        return other.\$tag === 1 && _dafny.areEqual(this.anchor, other.anchor);
      } else if (this.\$tag === 2) {
        return other.\$tag === 2 && _dafny.areEqual(this.anchor, other.anchor);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanDomain.Place.create_AtEnd();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Place.Default();
        }
      };
    }
  }

  \$module.Action = class Action {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_NoOp() {
      let \$dt = new Action(0);
      return \$dt;
    }
    static create_AddColumn(col, limit) {
      let \$dt = new Action(1);
      \$dt.col = col;
      \$dt.limit = limit;
      return \$dt;
    }
    static create_SetWip(col, limit) {
      let \$dt = new Action(2);
      \$dt.col = col;
      \$dt.limit = limit;
      return \$dt;
    }
    static create_AddCard(col, title) {
      let \$dt = new Action(3);
      \$dt.col = col;
      \$dt.title = title;
      return \$dt;
    }
    static create_MoveCard(id, toCol, place) {
      let \$dt = new Action(4);
      \$dt.id = id;
      \$dt.toCol = toCol;
      \$dt.place = place;
      return \$dt;
    }
    static create_EditTitle(id, title) {
      let \$dt = new Action(5);
      \$dt.id = id;
      \$dt.title = title;
      return \$dt;
    }
    get is_NoOp() { return this.\$tag === 0; }
    get is_AddColumn() { return this.\$tag === 1; }
    get is_SetWip() { return this.\$tag === 2; }
    get is_AddCard() { return this.\$tag === 3; }
    get is_MoveCard() { return this.\$tag === 4; }
    get is_EditTitle() { return this.\$tag === 5; }
    get dtor_col() { return this.col; }
    get dtor_limit() { return this.limit; }
    get dtor_title() { return this.title; }
    get dtor_id() { return this.id; }
    get dtor_toCol() { return this.toCol; }
    get dtor_place() { return this.place; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Action.NoOp";
      } else if (this.\$tag === 1) {
        return "KanbanDomain.Action.AddColumn" + "(" + this.col.toVerbatimString(true) + ", " + _dafny.toString(this.limit) + ")";
      } else if (this.\$tag === 2) {
        return "KanbanDomain.Action.SetWip" + "(" + this.col.toVerbatimString(true) + ", " + _dafny.toString(this.limit) + ")";
      } else if (this.\$tag === 3) {
        return "KanbanDomain.Action.AddCard" + "(" + this.col.toVerbatimString(true) + ", " + this.title.toVerbatimString(true) + ")";
      } else if (this.\$tag === 4) {
        return "KanbanDomain.Action.MoveCard" + "(" + _dafny.toString(this.id) + ", " + this.toCol.toVerbatimString(true) + ", " + _dafny.toString(this.place) + ")";
      } else if (this.\$tag === 5) {
        return "KanbanDomain.Action.EditTitle" + "(" + _dafny.toString(this.id) + ", " + this.title.toVerbatimString(true) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0;
      } else if (this.\$tag === 1) {
        return other.\$tag === 1 && _dafny.areEqual(this.col, other.col) && _dafny.areEqual(this.limit, other.limit);
      } else if (this.\$tag === 2) {
        return other.\$tag === 2 && _dafny.areEqual(this.col, other.col) && _dafny.areEqual(this.limit, other.limit);
      } else if (this.\$tag === 3) {
        return other.\$tag === 3 && _dafny.areEqual(this.col, other.col) && _dafny.areEqual(this.title, other.title);
      } else if (this.\$tag === 4) {
        return other.\$tag === 4 && _dafny.areEqual(this.id, other.id) && _dafny.areEqual(this.toCol, other.toCol) && _dafny.areEqual(this.place, other.place);
      } else if (this.\$tag === 5) {
        return other.\$tag === 5 && _dafny.areEqual(this.id, other.id) && _dafny.areEqual(this.title, other.title);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanDomain.Action.create_NoOp();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Action.Default();
        }
      };
    }
  }

  \$module.Result = class Result {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Ok(value) {
      let \$dt = new Result(0);
      \$dt.value = value;
      return \$dt;
    }
    static create_Err(error) {
      let \$dt = new Result(1);
      \$dt.error = error;
      return \$dt;
    }
    get is_Ok() { return this.\$tag === 0; }
    get is_Err() { return this.\$tag === 1; }
    get dtor_value() { return this.value; }
    get dtor_error() { return this.error; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanDomain.Result.Ok" + "(" + _dafny.toString(this.value) + ")";
      } else if (this.\$tag === 1) {
        return "KanbanDomain.Result.Err" + "(" + _dafny.toString(this.error) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.value, other.value);
      } else if (this.\$tag === 1) {
        return other.\$tag === 1 && _dafny.areEqual(this.error, other.error);
      } else  {
        return false; // unexpected
      }
    }
    static Default(_default_T) {
      return KanbanDomain.Result.create_Ok(_default_T);
    }
    static Rtd(rtd\$_T) {
      return class {
        static get Default() {
          return Result.Default(rtd\$_T.Default);
        }
      };
    }
  }
  return \$module;
})(); // end of module KanbanDomain
let KanbanMultiCollaboration = (function() {
  let \$module = {};

  \$module.__default = class __default {
    constructor () {
      this._tname = "KanbanMultiCollaboration._default";
    }
    _parentTraits() {
      return [];
    }
    static Version(s) {
      return new BigNumber(((s).dtor_appliedLog).length);
    };
    static InitServer() {
      return KanbanMultiCollaboration.ServerState.create_ServerState(KanbanDomain.__default.Init(), _dafny.Seq.of(), _dafny.Seq.of());
    };
    static ChooseCandidate(m, cs) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cs).length)).isEqualTo(_dafny.ZERO)) {
          return KanbanDomain.Result.create_Err(KanbanDomain.__default.RejectErr());
        } else {
          let _source0 = KanbanDomain.__default.TryStep(m, (cs)[_dafny.ZERO]);
          {
            if (_source0.is_Ok) {
              let _0_m2 = (_source0).value;
              return KanbanDomain.Result.create_Ok(_dafny.Tuple.of(_0_m2, (cs)[_dafny.ZERO]));
            }
          }
          {
            let _in0 = m;
            let _in1 = (cs).slice(_dafny.ONE);
            m = _in0;
            cs = _in1;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static Dispatch(s, baseVersion, orig) {
      let _0_suffix = ((s).dtor_appliedLog).slice(baseVersion);
      let _1_rebased = KanbanDomain.__default.RebaseThroughSuffix(_0_suffix, orig);
      let _2_cs = KanbanDomain.__default.Candidates((s).dtor_present, _1_rebased);
      let _source0 = KanbanMultiCollaboration.__default.ChooseCandidate((s).dtor_present, _2_cs);
      {
        if (_source0.is_Ok) {
          let _3_pair = (_source0).value;
          let _4_m2 = (_3_pair)[0];
          let _5_chosen = (_3_pair)[1];
          let _6_noChange = _dafny.areEqual(_4_m2, (s).dtor_present);
          let _7_newApplied = _dafny.Seq.Concat((s).dtor_appliedLog, _dafny.Seq.of(_5_chosen));
          let _8_rec = KanbanMultiCollaboration.RequestRecord.create_Req(baseVersion, orig, _1_rebased, _5_chosen, KanbanMultiCollaboration.RequestOutcome.create_AuditAccepted(_5_chosen, _6_noChange));
          let _9_newAudit = _dafny.Seq.Concat((s).dtor_auditLog, _dafny.Seq.of(_8_rec));
          return _dafny.Tuple.of(KanbanMultiCollaboration.ServerState.create_ServerState(_4_m2, _7_newApplied, _9_newAudit), KanbanMultiCollaboration.Reply.create_Accepted(new BigNumber((_7_newApplied).length), _4_m2, _5_chosen, _6_noChange));
        }
      }
      {
        let _10_rec = KanbanMultiCollaboration.RequestRecord.create_Req(baseVersion, orig, _1_rebased, _1_rebased, KanbanMultiCollaboration.RequestOutcome.create_AuditRejected(KanbanMultiCollaboration.RejectReason.create_DomainInvalid(), _1_rebased));
        let _11_newAudit = _dafny.Seq.Concat((s).dtor_auditLog, _dafny.Seq.of(_10_rec));
        return _dafny.Tuple.of(KanbanMultiCollaboration.ServerState.create_ServerState((s).dtor_present, (s).dtor_appliedLog, _11_newAudit), KanbanMultiCollaboration.Reply.create_Rejected(KanbanMultiCollaboration.RejectReason.create_DomainInvalid(), _1_rebased));
      }
    };
    static InitClient(version, model) {
      return KanbanMultiCollaboration.ClientState.create_ClientState(version, model, _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return KanbanMultiCollaboration.ClientState.create_ClientState(KanbanMultiCollaboration.__default.Version(server), (server).dtor_present, _dafny.Seq.of());
    };
    static Sync(server) {
      return KanbanMultiCollaboration.ClientState.create_ClientState(KanbanMultiCollaboration.__default.Version(server), (server).dtor_present, _dafny.Seq.of());
    };
    static ClientLocalDispatch(client, action) {
      let _0_result = KanbanDomain.__default.TryStep((client).dtor_present, action);
      let _source0 = _0_result;
      {
        if (_source0.is_Ok) {
          let _1_newModel = (_source0).value;
          return KanbanMultiCollaboration.ClientState.create_ClientState((client).dtor_baseVersion, _1_newModel, _dafny.Seq.Concat((client).dtor_pending, _dafny.Seq.of(action)));
        }
      }
      {
        return KanbanMultiCollaboration.ClientState.create_ClientState((client).dtor_baseVersion, (client).dtor_present, _dafny.Seq.Concat((client).dtor_pending, _dafny.Seq.of(action)));
      }
    };
    static ReapplyPending(model, pending) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((pending).length)).isEqualTo(_dafny.ZERO)) {
          return model;
        } else {
          let _0_result = KanbanDomain.__default.TryStep(model, (pending)[_dafny.ZERO]);
          let _1_newModel = function () {
            let _source0 = _0_result;
            {
              if (_source0.is_Ok) {
                let _2_m = (_source0).value;
                return _2_m;
              }
            }
            {
              return model;
            }
          }();
          let _in0 = _1_newModel;
          let _in1 = (pending).slice(_dafny.ONE);
          model = _in0;
          pending = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static HandleRealtimeUpdate(client, serverVersion, serverModel) {
      if (((client).dtor_baseVersion).isLessThan(serverVersion)) {
        let _0_newPresent = KanbanMultiCollaboration.__default.ReapplyPending(serverModel, (client).dtor_pending);
        return KanbanMultiCollaboration.ClientState.create_ClientState(serverVersion, _0_newPresent, (client).dtor_pending);
      } else {
        return client;
      }
    };
    static FlushOne(server, client) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return KanbanDomain.Result.create_Err(KanbanDomain.__default.RejectErr());
      } else {
        let _0_action = ((client).dtor_pending)[_dafny.ZERO];
        let _1_rest = ((client).dtor_pending).slice(_dafny.ONE);
        let _let_tmp_rhs0 = KanbanMultiCollaboration.__default.Dispatch(server, (client).dtor_baseVersion, _0_action);
        let _2_newServer = (_let_tmp_rhs0)[0];
        let _3_reply = (_let_tmp_rhs0)[1];
        let _source0 = _3_reply;
        {
          if (_source0.is_Accepted) {
            let _4_newVersion = (_source0).newVersion;
            let _5_newPresent = (_source0).newPresent;
            let _6_applied = (_source0).applied;
            let _7_noChange = (_source0).noChange;
            let _8_newClient = KanbanMultiCollaboration.ClientState.create_ClientState(_4_newVersion, _5_newPresent, _1_rest);
            return KanbanDomain.Result.create_Ok(KanbanMultiCollaboration.FlushResult.create_FlushResult(_2_newServer, _8_newClient, _3_reply));
          }
        }
        {
          let _9_reason = (_source0).reason;
          let _10_rebased = (_source0).rebased;
          let _11_newClient = KanbanMultiCollaboration.ClientState.create_ClientState(KanbanMultiCollaboration.__default.Version(server), (server).dtor_present, _1_rest);
          return KanbanDomain.Result.create_Ok(KanbanMultiCollaboration.FlushResult.create_FlushResult(_2_newServer, _11_newClient, _3_reply));
        }
      }
    };
    static FlushAll(server, client) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return KanbanMultiCollaboration.FlushAllResult.create_FlushAllResult(server, client, _dafny.Seq.of());
      } else {
        let _0_flushResult = KanbanMultiCollaboration.__default.FlushOne(server, client);
        let _source0 = _0_flushResult;
        {
          if (_source0.is_Err) {
            return KanbanMultiCollaboration.FlushAllResult.create_FlushAllResult(server, client, _dafny.Seq.of());
          }
        }
        {
          let _1_result = (_source0).value;
          if ((((_1_result).dtor_client).dtor_baseVersion).isLessThanOrEqualTo(KanbanMultiCollaboration.__default.Version((_1_result).dtor_server))) {
            let _2_rest = KanbanMultiCollaboration.__default.FlushAll((_1_result).dtor_server, (_1_result).dtor_client);
            return KanbanMultiCollaboration.FlushAllResult.create_FlushAllResult((_2_rest).dtor_server, (_2_rest).dtor_client, _dafny.Seq.Concat(_dafny.Seq.of((_1_result).dtor_reply), (_2_rest).dtor_replies));
          } else {
            return KanbanMultiCollaboration.FlushAllResult.create_FlushAllResult((_1_result).dtor_server, (_1_result).dtor_client, _dafny.Seq.of((_1_result).dtor_reply));
          }
        }
      }
    };
    static ClientAcceptReply(client, newVersion, newPresent) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return KanbanMultiCollaboration.ClientState.create_ClientState(newVersion, newPresent, _dafny.Seq.of());
      } else {
        let _0_rest = ((client).dtor_pending).slice(_dafny.ONE);
        let _1_reappliedPresent = KanbanMultiCollaboration.__default.ReapplyPending(newPresent, _0_rest);
        return KanbanMultiCollaboration.ClientState.create_ClientState(newVersion, _1_reappliedPresent, _0_rest);
      }
    };
    static PendingCount(client) {
      return new BigNumber(((client).dtor_pending).length);
    };
    static ClientModel(client) {
      return (client).dtor_present;
    };
    static ClientVersion(client) {
      return (client).dtor_baseVersion;
    };
  };

  \$module.RejectReason = class RejectReason {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_DomainInvalid() {
      let \$dt = new RejectReason(0);
      return \$dt;
    }
    get is_DomainInvalid() { return this.\$tag === 0; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield RejectReason.create_DomainInvalid();
    }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.RejectReason.DomainInvalid";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.RejectReason.create_DomainInvalid();
    }
    static Rtd() {
      return class {
        static get Default() {
          return RejectReason.Default();
        }
      };
    }
  }

  \$module.Reply = class Reply {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Accepted(newVersion, newPresent, applied, noChange) {
      let \$dt = new Reply(0);
      \$dt.newVersion = newVersion;
      \$dt.newPresent = newPresent;
      \$dt.applied = applied;
      \$dt.noChange = noChange;
      return \$dt;
    }
    static create_Rejected(reason, rebased) {
      let \$dt = new Reply(1);
      \$dt.reason = reason;
      \$dt.rebased = rebased;
      return \$dt;
    }
    get is_Accepted() { return this.\$tag === 0; }
    get is_Rejected() { return this.\$tag === 1; }
    get dtor_newVersion() { return this.newVersion; }
    get dtor_newPresent() { return this.newPresent; }
    get dtor_applied() { return this.applied; }
    get dtor_noChange() { return this.noChange; }
    get dtor_reason() { return this.reason; }
    get dtor_rebased() { return this.rebased; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.Reply.Accepted" + "(" + _dafny.toString(this.newVersion) + ", " + _dafny.toString(this.newPresent) + ", " + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.\$tag === 1) {
        return "KanbanMultiCollaboration.Reply.Rejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.newVersion, other.newVersion) && _dafny.areEqual(this.newPresent, other.newPresent) && _dafny.areEqual(this.applied, other.applied) && this.noChange === other.noChange;
      } else if (this.\$tag === 1) {
        return other.\$tag === 1 && _dafny.areEqual(this.reason, other.reason) && _dafny.areEqual(this.rebased, other.rebased);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.Reply.create_Accepted(_dafny.ZERO, KanbanDomain.Model.Default(), KanbanDomain.Action.Default(), false);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Reply.Default();
        }
      };
    }
  }

  \$module.RequestOutcome = class RequestOutcome {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_AuditAccepted(applied, noChange) {
      let \$dt = new RequestOutcome(0);
      \$dt.applied = applied;
      \$dt.noChange = noChange;
      return \$dt;
    }
    static create_AuditRejected(reason, rebased) {
      let \$dt = new RequestOutcome(1);
      \$dt.reason = reason;
      \$dt.rebased = rebased;
      return \$dt;
    }
    get is_AuditAccepted() { return this.\$tag === 0; }
    get is_AuditRejected() { return this.\$tag === 1; }
    get dtor_applied() { return this.applied; }
    get dtor_noChange() { return this.noChange; }
    get dtor_reason() { return this.reason; }
    get dtor_rebased() { return this.rebased; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.RequestOutcome.AuditAccepted" + "(" + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.\$tag === 1) {
        return "KanbanMultiCollaboration.RequestOutcome.AuditRejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.applied, other.applied) && this.noChange === other.noChange;
      } else if (this.\$tag === 1) {
        return other.\$tag === 1 && _dafny.areEqual(this.reason, other.reason) && _dafny.areEqual(this.rebased, other.rebased);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.RequestOutcome.create_AuditAccepted(KanbanDomain.Action.Default(), false);
    }
    static Rtd() {
      return class {
        static get Default() {
          return RequestOutcome.Default();
        }
      };
    }
  }

  \$module.RequestRecord = class RequestRecord {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Req(baseVersion, orig, rebased, chosen, outcome) {
      let \$dt = new RequestRecord(0);
      \$dt.baseVersion = baseVersion;
      \$dt.orig = orig;
      \$dt.rebased = rebased;
      \$dt.chosen = chosen;
      \$dt.outcome = outcome;
      return \$dt;
    }
    get is_Req() { return this.\$tag === 0; }
    get dtor_baseVersion() { return this.baseVersion; }
    get dtor_orig() { return this.orig; }
    get dtor_rebased() { return this.rebased; }
    get dtor_chosen() { return this.chosen; }
    get dtor_outcome() { return this.outcome; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.RequestRecord.Req" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.orig) + ", " + _dafny.toString(this.rebased) + ", " + _dafny.toString(this.chosen) + ", " + _dafny.toString(this.outcome) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.baseVersion, other.baseVersion) && _dafny.areEqual(this.orig, other.orig) && _dafny.areEqual(this.rebased, other.rebased) && _dafny.areEqual(this.chosen, other.chosen) && _dafny.areEqual(this.outcome, other.outcome);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.RequestRecord.create_Req(_dafny.ZERO, KanbanDomain.Action.Default(), KanbanDomain.Action.Default(), KanbanDomain.Action.Default(), KanbanMultiCollaboration.RequestOutcome.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return RequestRecord.Default();
        }
      };
    }
  }

  \$module.ServerState = class ServerState {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_ServerState(present, appliedLog, auditLog) {
      let \$dt = new ServerState(0);
      \$dt.present = present;
      \$dt.appliedLog = appliedLog;
      \$dt.auditLog = auditLog;
      return \$dt;
    }
    get is_ServerState() { return this.\$tag === 0; }
    get dtor_present() { return this.present; }
    get dtor_appliedLog() { return this.appliedLog; }
    get dtor_auditLog() { return this.auditLog; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.ServerState.ServerState" + "(" + _dafny.toString(this.present) + ", " + _dafny.toString(this.appliedLog) + ", " + _dafny.toString(this.auditLog) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.present, other.present) && _dafny.areEqual(this.appliedLog, other.appliedLog) && _dafny.areEqual(this.auditLog, other.auditLog);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.ServerState.create_ServerState(KanbanDomain.Model.Default(), _dafny.Seq.of(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return ServerState.Default();
        }
      };
    }
  }

  \$module.ClientState = class ClientState {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_ClientState(baseVersion, present, pending) {
      let \$dt = new ClientState(0);
      \$dt.baseVersion = baseVersion;
      \$dt.present = present;
      \$dt.pending = pending;
      return \$dt;
    }
    get is_ClientState() { return this.\$tag === 0; }
    get dtor_baseVersion() { return this.baseVersion; }
    get dtor_present() { return this.present; }
    get dtor_pending() { return this.pending; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.ClientState.ClientState" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.pending) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.baseVersion, other.baseVersion) && _dafny.areEqual(this.present, other.present) && _dafny.areEqual(this.pending, other.pending);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.ClientState.create_ClientState(_dafny.ZERO, KanbanDomain.Model.Default(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return ClientState.Default();
        }
      };
    }
  }

  \$module.FlushResult = class FlushResult {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_FlushResult(server, client, reply) {
      let \$dt = new FlushResult(0);
      \$dt.server = server;
      \$dt.client = client;
      \$dt.reply = reply;
      return \$dt;
    }
    get is_FlushResult() { return this.\$tag === 0; }
    get dtor_server() { return this.server; }
    get dtor_client() { return this.client; }
    get dtor_reply() { return this.reply; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.FlushResult.FlushResult" + "(" + _dafny.toString(this.server) + ", " + _dafny.toString(this.client) + ", " + _dafny.toString(this.reply) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.server, other.server) && _dafny.areEqual(this.client, other.client) && _dafny.areEqual(this.reply, other.reply);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.FlushResult.create_FlushResult(KanbanMultiCollaboration.ServerState.Default(), KanbanMultiCollaboration.ClientState.Default(), KanbanMultiCollaboration.Reply.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return FlushResult.Default();
        }
      };
    }
  }

  \$module.FlushAllResult = class FlushAllResult {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_FlushAllResult(server, client, replies) {
      let \$dt = new FlushAllResult(0);
      \$dt.server = server;
      \$dt.client = client;
      \$dt.replies = replies;
      return \$dt;
    }
    get is_FlushAllResult() { return this.\$tag === 0; }
    get dtor_server() { return this.server; }
    get dtor_client() { return this.client; }
    get dtor_replies() { return this.replies; }
    toString() {
      if (this.\$tag === 0) {
        return "KanbanMultiCollaboration.FlushAllResult.FlushAllResult" + "(" + _dafny.toString(this.server) + ", " + _dafny.toString(this.client) + ", " + _dafny.toString(this.replies) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.server, other.server) && _dafny.areEqual(this.client, other.client) && _dafny.areEqual(this.replies, other.replies);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanMultiCollaboration.FlushAllResult.create_FlushAllResult(KanbanMultiCollaboration.ServerState.Default(), KanbanMultiCollaboration.ClientState.Default(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return FlushAllResult.Default();
        }
      };
    }
  }
  return \$module;
})(); // end of module KanbanMultiCollaboration
let KanbanAppCore = (function() {
  let \$module = {};

  \$module.__default = class __default {
    constructor () {
      this._tname = "KanbanAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static MakeClientState(baseVersion, present, pending) {
      return KanbanMultiCollaboration.ClientState.create_ClientState(baseVersion, present, pending);
    };
    static Init() {
      return KanbanMultiCollaboration.__default.InitServer();
    };
    static InitServerWithModel(initModel) {
      return KanbanMultiCollaboration.ServerState.create_ServerState(initModel, _dafny.Seq.of(), _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return KanbanMultiCollaboration.__default.InitClientFromServer(server);
    };
    static ClientLocalDispatch(client, action) {
      return KanbanMultiCollaboration.__default.ClientLocalDispatch(client, action);
    };
    static HandleRealtimeUpdate(client, serverVersion, serverModel) {
      return KanbanMultiCollaboration.__default.HandleRealtimeUpdate(client, serverVersion, serverModel);
    };
    static ClientAcceptReply(client, newVersion, newPresent) {
      return KanbanMultiCollaboration.__default.ClientAcceptReply(client, newVersion, newPresent);
    };
    static Sync(server) {
      return KanbanMultiCollaboration.__default.Sync(server);
    };
    static ServerVersion(server) {
      return KanbanMultiCollaboration.__default.Version(server);
    };
    static ServerModel(server) {
      return (server).dtor_present;
    };
    static AuditLength(server) {
      return new BigNumber(((server).dtor_auditLog).length);
    };
    static PendingCount(client) {
      return KanbanMultiCollaboration.__default.PendingCount(client);
    };
    static ClientModel(client) {
      return KanbanMultiCollaboration.__default.ClientModel(client);
    };
    static ClientVersion(client) {
      return KanbanMultiCollaboration.__default.ClientVersion(client);
    };
    static IsAccepted(reply) {
      return (reply).is_Accepted;
    };
    static IsRejected(reply) {
      return (reply).is_Rejected;
    };
  };
  return \$module;
})(); // end of module KanbanAppCore
let _module = (function() {
  let \$module = {};

  return \$module;
})(); // end of module _module

  return { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore };
`);

const { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore } = initDafny(require, exports, module);

export { _dafny, KanbanDomain, KanbanMultiCollaboration, KanbanAppCore, BigNumber };

// ============================================================================
// Helper functions
// ============================================================================

// deno-lint-ignore no-explicit-any
const seqToArray = (seq: any): any[] => {
  const arr = [];
  for (let i = 0; i < seq.length; i++) {
    arr.push(seq[i]);
  }
  return arr;
};

// deno-lint-ignore no-explicit-any
const toNumber = (bn: any): number => {
  if (bn && typeof bn.toNumber === 'function') {
    return bn.toNumber();
  }
  return bn;
};

// deno-lint-ignore no-explicit-any
const dafnyStringToJs = (seq: any): string => {
  if (typeof seq === 'string') return seq;
  if (seq.toVerbatimString) return seq.toVerbatimString(false);
  return Array.from(seq).join('');
};

// ============================================================================
// Model conversion
// ============================================================================

interface Model {
  cols: string[];
  lanes: Record<string, number[]>;
  wip: Record<string, number>;
  cards: Record<number, { title: string }>;
  nextId: number;
}

interface Place {
  type: 'AtEnd' | 'Before' | 'After';
  anchor?: number;
}

interface Action {
  type: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// deno-lint-ignore no-explicit-any
export const modelFromJson = (json: Model): any => {
  const cols = _dafny.Seq.of(
    ...(json.cols || []).map((c: string) => _dafny.Seq.UnicodeFromString(c))
  );

  let lanesMap = _dafny.Map.Empty;
  for (const [colName, cardIds] of Object.entries(json.lanes || {})) {
    const key = _dafny.Seq.UnicodeFromString(colName);
    const value = _dafny.Seq.of(...(cardIds as number[]).map((id: number) => new BigNumber(id)));
    lanesMap = lanesMap.update(key, value);
  }

  let wipMap = _dafny.Map.Empty;
  for (const [colName, limit] of Object.entries(json.wip || {})) {
    const key = _dafny.Seq.UnicodeFromString(colName);
    wipMap = wipMap.update(key, new BigNumber(limit as number));
  }

  let cardsMap = _dafny.Map.Empty;
  for (const [cardId, card] of Object.entries(json.cards || {})) {
    const key = new BigNumber(cardId);
    const value = _dafny.Seq.UnicodeFromString((card as { title: string }).title);
    cardsMap = cardsMap.update(key, value);
  }

  return KanbanDomain.Model.create_Model(
    cols,
    lanesMap,
    wipMap,
    cardsMap,
    new BigNumber(json.nextId || 0)
  );
};

// deno-lint-ignore no-explicit-any
export const modelToJson = (m: any): Model => {
  const cols = seqToArray(m.dtor_cols).map((c: unknown) => dafnyStringToJs(c));

  const lanes: Record<string, number[]> = {};
  const wip: Record<string, number> = {};
  const cards: Record<number, { title: string }> = {};

  if (m.dtor_lanes && m.dtor_lanes.Keys) {
    for (const key of m.dtor_lanes.Keys.Elements) {
      const colName = dafnyStringToJs(key);
      const cardIds = m.dtor_lanes.get(key);
      lanes[colName] = seqToArray(cardIds).map((id: unknown) => toNumber(id));
    }
  }

  if (m.dtor_wip && m.dtor_wip.Keys) {
    for (const key of m.dtor_wip.Keys.Elements) {
      wip[dafnyStringToJs(key)] = toNumber(m.dtor_wip.get(key));
    }
  }

  if (m.dtor_cards && m.dtor_cards.Keys) {
    for (const key of m.dtor_cards.Keys.Elements) {
      const card = m.dtor_cards.get(key);
      const title = card.dtor_title !== undefined
        ? dafnyStringToJs(card.dtor_title)
        : dafnyStringToJs(card);
      cards[toNumber(key)] = { title };
    }
  }

  return {
    cols,
    lanes,
    wip,
    cards,
    nextId: toNumber(m.dtor_nextId)
  };
};

// ============================================================================
// Action conversion
// ============================================================================

// deno-lint-ignore no-explicit-any
export const actionFromJson = (json: Action): any => {
  switch (json.type) {
    case 'NoOp':
      return KanbanDomain.Action.create_NoOp();
    case 'AddColumn':
      return KanbanDomain.Action.create_AddColumn(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      );
    case 'SetWip':
      return KanbanDomain.Action.create_SetWip(
        _dafny.Seq.UnicodeFromString(json.col),
        new BigNumber(json.limit)
      );
    case 'AddCard':
      return KanbanDomain.Action.create_AddCard(
        _dafny.Seq.UnicodeFromString(json.col),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    case 'MoveCard': {
      const place = json.place?.type === 'Before'
        ? KanbanDomain.Place.create_Before(new BigNumber(json.place.anchor))
        : json.place?.type === 'After'
        ? KanbanDomain.Place.create_After(new BigNumber(json.place.anchor))
        : KanbanDomain.Place.create_AtEnd();
      return KanbanDomain.Action.create_MoveCard(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.toCol),
        place
      );
    }
    case 'EditTitle':
      return KanbanDomain.Action.create_EditTitle(
        new BigNumber(json.id),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    default:
      return KanbanDomain.Action.create_NoOp();
  }
};

// deno-lint-ignore no-explicit-any
export const actionToJson = (action: any): Action => {
  if (action.is_NoOp) {
    return { type: 'NoOp' };
  }
  if (action.is_AddColumn) {
    return {
      type: 'AddColumn',
      col: dafnyStringToJs(action.dtor_col),
      limit: toNumber(action.dtor_limit)
    };
  }
  if (action.is_SetWip) {
    return {
      type: 'SetWip',
      col: dafnyStringToJs(action.dtor_col),
      limit: toNumber(action.dtor_limit)
    };
  }
  if (action.is_AddCard) {
    return {
      type: 'AddCard',
      col: dafnyStringToJs(action.dtor_col),
      title: dafnyStringToJs(action.dtor_title)
    };
  }
  if (action.is_MoveCard) {
    const place = action.dtor_place;
    let placeJson: Place;
    if (place.is_AtEnd) {
      placeJson = { type: 'AtEnd' };
    } else if (place.is_Before) {
      placeJson = { type: 'Before', anchor: toNumber(place.dtor_anchor) };
    } else {
      placeJson = { type: 'After', anchor: toNumber(place.dtor_anchor) };
    }
    return {
      type: 'MoveCard',
      id: toNumber(action.dtor_id),
      toCol: dafnyStringToJs(action.dtor_toCol),
      place: placeJson
    };
  }
  if (action.is_EditTitle) {
    return {
      type: 'EditTitle',
      id: toNumber(action.dtor_id),
      title: dafnyStringToJs(action.dtor_title)
    };
  }
  return { type: 'NoOp' };
};

// ============================================================================
// Domain operations using actual Dafny code
// ============================================================================

export const tryStep = (modelJson: Model, actionJson: Action): { ok: boolean; value?: Model } => {
  const model = modelFromJson(modelJson);
  const action = actionFromJson(actionJson);
  const result = KanbanDomain.__default.TryStep(model, action);

  if (result.is_Ok) {
    return { ok: true, value: modelToJson(result.dtor_value) };
  }
  return { ok: false };
};

export const rebaseAction = (remoteJson: Action, localJson: Action): Action => {
  const remote = actionFromJson(remoteJson);
  const local = actionFromJson(localJson);
  const rebased = KanbanDomain.__default.Rebase(remote, local);
  return actionToJson(rebased);
};

export const getCandidates = (modelJson: Model, actionJson: Action): Action[] => {
  const model = modelFromJson(modelJson);
  const action = actionFromJson(actionJson);
  const candidates = KanbanDomain.__default.Candidates(model, action);
  return seqToArray(candidates).map(actionToJson);
};

export const rebaseThroughSuffix = (suffix: Action[], actionJson: Action): Action => {
  let action = actionFromJson(actionJson);
  for (let i = suffix.length - 1; i >= 0; i--) {
    const remote = actionFromJson(suffix[i]);
    action = KanbanDomain.__default.Rebase(remote, action);
  }
  return actionToJson(action);
};

// ============================================================================
// ServerState conversion (for verified Dispatch)
// ============================================================================

interface ServerStateJson {
  present: Model;
  appliedLog: Action[];
  auditLog?: AuditRecord[];
}

interface AuditRecord {
  baseVersion: number;
  orig: Action;
  rebased: Action;
  chosen: Action;
  outcome: {
    type: 'accepted' | 'rejected';
    applied?: Action;
    noChange?: boolean;
    reason?: string;
  };
}

// deno-lint-ignore no-explicit-any
export const serverStateFromJson = (json: ServerStateJson): any => {
  const present = modelFromJson(json.present);

  // Convert appliedLog: Action[] -> Dafny seq<Action>
  const appliedActions = (json.appliedLog || []).map(actionFromJson);
  const appliedLog = _dafny.Seq.of(...appliedActions);

  // Convert auditLog: AuditRecord[] -> Dafny seq<RequestRecord>
  const auditRecords = (json.auditLog || []).map((rec: AuditRecord) => {
    const outcome = rec.outcome.type === 'accepted'
      ? KanbanMultiCollaboration.RequestOutcome.create_AuditAccepted(
          actionFromJson(rec.outcome.applied!),
          rec.outcome.noChange || false
        )
      : KanbanMultiCollaboration.RequestOutcome.create_AuditRejected(
          KanbanMultiCollaboration.RejectReason.create_DomainInvalid(),
          actionFromJson(rec.outcome.applied || rec.rebased)
        );

    return KanbanMultiCollaboration.RequestRecord.create_Req(
      new BigNumber(rec.baseVersion),
      actionFromJson(rec.orig),
      actionFromJson(rec.rebased),
      actionFromJson(rec.chosen),
      outcome
    );
  });
  const auditLog = _dafny.Seq.of(...auditRecords);

  return KanbanMultiCollaboration.ServerState.create_ServerState(
    present,
    appliedLog,
    auditLog
  );
};

// deno-lint-ignore no-explicit-any
export const serverStateToJson = (s: any): ServerStateJson => {
  const present = modelToJson(s.dtor_present);

  // Convert appliedLog: Dafny seq<Action> -> Action[]
  const appliedLog = seqToArray(s.dtor_appliedLog).map(actionToJson);

  // Convert auditLog: Dafny seq<RequestRecord> -> AuditRecord[]
  const auditLog = seqToArray(s.dtor_auditLog).map((rec: any) => {
    const outcome = rec.dtor_outcome;
    return {
      baseVersion: toNumber(rec.dtor_baseVersion),
      orig: actionToJson(rec.dtor_orig),
      rebased: actionToJson(rec.dtor_rebased),
      chosen: actionToJson(rec.dtor_chosen),
      outcome: outcome.is_AuditAccepted
        ? {
            type: 'accepted' as const,
            applied: actionToJson(outcome.dtor_applied),
            noChange: outcome.dtor_noChange
          }
        : {
            type: 'rejected' as const,
            reason: 'DomainInvalid',
            applied: actionToJson(outcome.dtor_rebased)
          }
    };
  });

  return { present, appliedLog, auditLog };
};

// ============================================================================
// Verified Dispatch (uses KanbanMultiCollaboration.Dispatch directly)
// ============================================================================

export interface DispatchResult {
  status: 'accepted' | 'rejected';
  state?: Model;
  appliedAction?: Action;
  newVersion?: number;
  noChange?: boolean;
  appliedLog?: Action[];
  auditLog?: AuditRecord[];
  reason?: string;
}

/**
 * Dispatch using the VERIFIED Dafny MultiCollaboration.Dispatch function.
 *
 * This replaces the previous unverified TypeScript orchestration with a single
 * call to the Dafny-verified Dispatch function, which handles:
 * - Rebasing through the suffix
 * - Generating candidates
 * - Choosing the first valid candidate
 * - Preserving invariants (proven)
 */
export function dispatch(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action,
  auditLog?: AuditRecord[]
): DispatchResult {
  // Build ServerState from JSON
  const serverState = serverStateFromJson({
    present: stateJson,
    appliedLog: appliedLog,
    auditLog: auditLog || []
  });

  // Call VERIFIED Dispatch
  const action = actionFromJson(actionJson);
  const result = KanbanMultiCollaboration.__default.Dispatch(
    serverState,
    new BigNumber(baseVersion),
    action
  );

  // Result is a tuple: [newServerState, reply]
  const newServerState = result[0];
  const reply = result[1];

  // Extract new state
  const newStateJson = serverStateToJson(newServerState);

  // Check reply type using KanbanAppCore helpers
  if (KanbanAppCore.__default.IsAccepted(reply)) {
    return {
      status: 'accepted',
      state: newStateJson.present,
      newVersion: toNumber(reply.dtor_newVersion),
      appliedAction: actionToJson(reply.dtor_applied),
      noChange: reply.dtor_noChange,
      appliedLog: newStateJson.appliedLog,
      auditLog: newStateJson.auditLog
    };
  } else {
    // Rejected
    return {
      status: 'rejected',
      reason: 'DomainInvalid',
      // Include the rebased action for debugging
      appliedAction: actionToJson(reply.dtor_rebased)
    };
  }
}

// ============================================================================
// Legacy dispatch (for backwards compatibility during migration)
// Uses the same verified Dispatch but with simpler interface
// ============================================================================

export function dispatchSimple(
  stateJson: Model,
  appliedLog: Action[],
  baseVersion: number,
  actionJson: Action
): { status: 'accepted' | 'rejected'; state?: Model; appliedAction?: Action; reason?: string } {
  const result = dispatch(stateJson, appliedLog, baseVersion, actionJson);
  return {
    status: result.status,
    state: result.state,
    appliedAction: result.appliedAction,
    reason: result.reason
  };
}
