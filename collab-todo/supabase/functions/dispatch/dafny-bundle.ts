// Dafny Todo Domain Bundle for Deno Edge Function
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
// Dafny program TodoMultiCollaboration.dfy compiled into JavaScript
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
let TodoDomain = (function() {
  let \$module = {};

  \$module.__default = class __default {
    constructor () {
      this._tname = "TodoDomain._default";
    }
    _parentTraits() {
      return [];
    }
    static DaysInMonth(month, year) {
      if ((month).isEqualTo(_dafny.ONE)) {
        return new BigNumber(31);
      } else if ((month).isEqualTo(new BigNumber(2))) {
        if (TodoDomain.__default.IsLeapYear(year)) {
          return new BigNumber(29);
        } else {
          return new BigNumber(28);
        }
      } else if ((month).isEqualTo(new BigNumber(3))) {
        return new BigNumber(31);
      } else if ((month).isEqualTo(new BigNumber(4))) {
        return new BigNumber(30);
      } else if ((month).isEqualTo(new BigNumber(5))) {
        return new BigNumber(31);
      } else if ((month).isEqualTo(new BigNumber(6))) {
        return new BigNumber(30);
      } else if ((month).isEqualTo(new BigNumber(7))) {
        return new BigNumber(31);
      } else if ((month).isEqualTo(new BigNumber(8))) {
        return new BigNumber(31);
      } else if ((month).isEqualTo(new BigNumber(9))) {
        return new BigNumber(30);
      } else if ((month).isEqualTo(new BigNumber(10))) {
        return new BigNumber(31);
      } else if ((month).isEqualTo(new BigNumber(11))) {
        return new BigNumber(30);
      } else if ((month).isEqualTo(new BigNumber(12))) {
        return new BigNumber(31);
      } else {
        return _dafny.ZERO;
      }
    };
    static IsLeapYear(year) {
      return ((((year).mod(new BigNumber(4))).isEqualTo(_dafny.ZERO)) && (!((year).mod(new BigNumber(100))).isEqualTo(_dafny.ZERO))) || (((year).mod(new BigNumber(400))).isEqualTo(_dafny.ZERO));
    };
    static ValidDate(d) {
      return (((((new BigNumber(1970)).isLessThanOrEqualTo((d).dtor_year)) && ((_dafny.ONE).isLessThanOrEqualTo((d).dtor_month))) && (((d).dtor_month).isLessThanOrEqualTo(new BigNumber(12)))) && ((_dafny.ONE).isLessThanOrEqualTo((d).dtor_day))) && (((d).dtor_day).isLessThanOrEqualTo(TodoDomain.__default.DaysInMonth((d).dtor_month, (d).dtor_year)));
    };
    static RejectErr() {
      return TodoDomain.Err.create_Rejected();
    };
    static Init() {
      return TodoDomain.Model.create_Model(TodoDomain.ProjectMode.create_Personal(), TodoDomain.__default.InitialOwner, _dafny.Set.fromElements(TodoDomain.__default.InitialOwner), _dafny.Seq.of(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
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
        let _0_j = TodoDomain.__default.IndexOf((s).slice(_dafny.ONE), x);
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
    static Get(mp, k, d) {
      if ((mp).contains(k)) {
        return (mp).get(k);
      } else {
        return d;
      }
    };
    static TaskList(m, l) {
      return TodoDomain.__default.Get((m).dtor_tasks, l, _dafny.Seq.of());
    };
    static FindListForTask(m, taskId) {
      return TodoDomain.__default.FindListForTaskHelper((m).dtor_lists, (m).dtor_tasks, taskId);
    };
    static FindListForTaskHelper(lists, tasks, taskId) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((lists).length)).isEqualTo(_dafny.ZERO)) {
          return TodoDomain.Option.create_None();
        } else {
          let _0_l = (lists)[_dafny.ZERO];
          let _1_lane = (((tasks).contains(_0_l)) ? ((tasks).get(_0_l)) : (_dafny.Seq.of()));
          if (TodoDomain.__default.SeqContains(_1_lane, taskId)) {
            return TodoDomain.Option.create_Some(_0_l);
          } else {
            let _in0 = (lists).slice(_dafny.ONE);
            let _in1 = tasks;
            let _in2 = taskId;
            lists = _in0;
            tasks = _in1;
            taskId = _in2;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static CountInLists(m, id) {
      return TodoDomain.__default.CountInListsHelper((m).dtor_lists, (m).dtor_tasks, id);
    };
    static CountInListsHelper(lists, tasks, id) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((lists).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          let _1_l = (lists)[_dafny.ZERO];
          let _2_lane = (((tasks).contains(_1_l)) ? ((tasks).get(_1_l)) : (_dafny.Seq.of()));
          let _3_here = ((TodoDomain.__default.SeqContains(_2_lane, id)) ? (_dafny.ONE) : (_dafny.ZERO));
          _0___accumulator = (_0___accumulator).plus(_3_here);
          let _in0 = (lists).slice(_dafny.ONE);
          let _in1 = tasks;
          let _in2 = id;
          lists = _in0;
          tasks = _in1;
          id = _in2;
          continue TAIL_CALL_START;
        }
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
          let _1_i = TodoDomain.__default.IndexOf(lane, _0_a);
          if ((_1_i).isLessThan(_dafny.ZERO)) {
            return new BigNumber(-1);
          } else {
            return _1_i;
          }
        }
      }
      {
        let _2_a = (_source0).anchor;
        let _3_i = TodoDomain.__default.IndexOf(lane, _2_a);
        if ((_3_i).isLessThan(_dafny.ZERO)) {
          return new BigNumber(-1);
        } else {
          return (_3_i).plus(_dafny.ONE);
        }
      }
    };
    static PosFromListPlace(lists, p) {
      let _source0 = p;
      {
        if (_source0.is_ListAtEnd) {
          return new BigNumber((lists).length);
        }
      }
      {
        if (_source0.is_ListBefore) {
          let _0_a = (_source0).anchor;
          let _1_i = TodoDomain.__default.IndexOf(lists, _0_a);
          if ((_1_i).isLessThan(_dafny.ZERO)) {
            return new BigNumber(-1);
          } else {
            return _1_i;
          }
        }
      }
      {
        let _2_a = (_source0).anchor;
        let _3_i = TodoDomain.__default.IndexOf(lists, _2_a);
        if ((_3_i).isLessThan(_dafny.ZERO)) {
          return new BigNumber(-1);
        } else {
          return (_3_i).plus(_dafny.ONE);
        }
      }
    };
    static RemoveTagFromAllTasks(taskData, tagId) {
      let _pat_let_tv0 = tagId;
      return function () {
        let _coll0 = new _dafny.Map();
        for (const _compr_0 of (taskData).Keys.Elements) {
          let _0_id = _compr_0;
          if (_System.nat._Is(_0_id)) {
            if ((taskData).contains(_0_id)) {
              _coll0.push([_0_id,function (_pat_let0_0) {
                return function (_1_t) {
                  return TodoDomain.Task.create_Task((_1_t).dtor_title, (_1_t).dtor_notes, (_1_t).dtor_completed, (_1_t).dtor_starred, (_1_t).dtor_dueDate, (_1_t).dtor_assignees, ((_1_t).dtor_tags).Difference(_dafny.Set.fromElements(_pat_let_tv0)), (_1_t).dtor_deleted, (_1_t).dtor_deletedBy, (_1_t).dtor_deletedFromList);
                }(_pat_let0_0);
              }((taskData).get(_0_id))]);
            }
          }
        }
        return _coll0;
      }();
    };
    static ClearAssigneeFromAllTasks(taskData, userId) {
      let _pat_let_tv0 = userId;
      return function () {
        let _coll0 = new _dafny.Map();
        for (const _compr_0 of (taskData).Keys.Elements) {
          let _0_id = _compr_0;
          if (_System.nat._Is(_0_id)) {
            if ((taskData).contains(_0_id)) {
              _coll0.push([_0_id,function (_pat_let1_0) {
                return function (_1_t) {
                  return TodoDomain.Task.create_Task((_1_t).dtor_title, (_1_t).dtor_notes, (_1_t).dtor_completed, (_1_t).dtor_starred, (_1_t).dtor_dueDate, ((_1_t).dtor_assignees).Difference(_dafny.Set.fromElements(_pat_let_tv0)), (_1_t).dtor_tags, (_1_t).dtor_deleted, (_1_t).dtor_deletedBy, (_1_t).dtor_deletedFromList);
                }(_pat_let1_0);
              }((taskData).get(_0_id))]);
            }
          }
        }
        return _coll0;
      }();
    };
    static ToLowerChar(c) {
      if (((new _dafny.CodePoint('A'.codePointAt(0))).isLessThanOrEqual(c)) && ((c).isLessThanOrEqual(new _dafny.CodePoint('Z'.codePointAt(0))))) {
        return new _dafny.CodePoint((((new BigNumber((c).value)).minus(new BigNumber((new _dafny.CodePoint('A'.codePointAt(0))).value))).plus(new BigNumber((new _dafny.CodePoint('a'.codePointAt(0))).value))).toNumber());
      } else {
        return c;
      }
    };
    static ToLower(s) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((s).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.UnicodeFromString(""));
        } else {
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of(TodoDomain.__default.ToLowerChar((s)[_dafny.ZERO])));
          let _in0 = (s).slice(_dafny.ONE);
          s = _in0;
          continue TAIL_CALL_START;
        }
      }
    };
    static EqIgnoreCase(a, b) {
      return _dafny.areEqual(TodoDomain.__default.ToLower(a), TodoDomain.__default.ToLower(b));
    };
    static ListNameExists(m, name, excludeList) {
      return _dafny.Quantifier(((m).dtor_listNames).Keys.Elements, false, function (_exists_var_0) {
        let _0_l = _exists_var_0;
        return ((((m).dtor_listNames).contains(_0_l)) && (((excludeList).is_None) || (!(_0_l).isEqualTo((excludeList).dtor_value)))) && (TodoDomain.__default.EqIgnoreCase(((m).dtor_listNames).get(_0_l), name));
      });
    };
    static TaskTitleExistsInList(m, listId, title, excludeTask) {
      return (((m).dtor_tasks).contains(listId)) && (_dafny.Quantifier(((m).dtor_taskData).Keys.Elements, false, function (_exists_var_0) {
        let _0_taskId = _exists_var_0;
        if (_System.nat._Is(_0_taskId)) {
          return ((((((m).dtor_taskData).contains(_0_taskId)) && (TodoDomain.__default.SeqContains(((m).dtor_tasks).get(listId), _0_taskId))) && (!((((m).dtor_taskData).get(_0_taskId)).dtor_deleted))) && (((excludeTask).is_None) || (!(_0_taskId).isEqualTo((excludeTask).dtor_value)))) && (TodoDomain.__default.EqIgnoreCase((((m).dtor_taskData).get(_0_taskId)).dtor_title, title));
        } else {
          return false;
        }
      }));
    };
    static TagNameExists(m, name, excludeTag) {
      return _dafny.Quantifier(((m).dtor_tags).Keys.Elements, false, function (_exists_var_0) {
        let _0_t = _exists_var_0;
        return ((((m).dtor_tags).contains(_0_t)) && (((excludeTag).is_None) || (!(_0_t).isEqualTo((excludeTag).dtor_value)))) && (TodoDomain.__default.EqIgnoreCase((((m).dtor_tags).get(_0_t)).dtor_name, name));
      });
    };
    static TryStep(m, a) {
      let _source0 = a;
      {
        if (_source0.is_NoOp) {
          return TodoDomain.Result.create_Ok(m);
        }
      }
      {
        if (_source0.is_AddList) {
          let _0_name = (_source0).name;
          if (TodoDomain.__default.ListNameExists(m, _0_name, TodoDomain.Option.create_None())) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateList());
          } else {
            let _1_id = (m).dtor_nextListId;
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, _dafny.Seq.Concat((m).dtor_lists, _dafny.Seq.of(_1_id)), ((m).dtor_listNames).update(_1_id, _0_name), ((m).dtor_tasks).update(_1_id, _dafny.Seq.of()), (m).dtor_taskData, (m).dtor_tags, ((m).dtor_nextListId).plus(_dafny.ONE), (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_RenameList) {
          let _2_listId = (_source0).listId;
          let _3_newName = (_source0).newName;
          if (!(TodoDomain.__default.SeqContains((m).dtor_lists, _2_listId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingList());
          } else if (TodoDomain.__default.ListNameExists(m, _3_newName, TodoDomain.Option.create_Some(_2_listId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateList());
          } else {
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, ((m).dtor_listNames).update(_2_listId, _3_newName), (m).dtor_tasks, (m).dtor_taskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_DeleteList) {
          let _4_listId = (_source0).listId;
          if (!(TodoDomain.__default.SeqContains((m).dtor_lists, _4_listId))) {
            return TodoDomain.Result.create_Ok(m);
          } else {
            let _5_tasksToRemove = function () {
              let _coll0 = new _dafny.Set();
              for (const _compr_0 of (TodoDomain.__default.TaskList(m, _4_listId)).Elements) {
                let _6_id = _compr_0;
                if (_dafny.Seq.contains(TodoDomain.__default.TaskList(m, _4_listId), _6_id)) {
                  _coll0.add(_6_id);
                }
              }
              return _coll0;
            }();
            let _7_newTaskData = function () {
              let _coll1 = new _dafny.Map();
              for (const _compr_1 of ((m).dtor_taskData).Keys.Elements) {
                let _8_id = _compr_1;
                if (_System.nat._Is(_8_id)) {
                  if ((((m).dtor_taskData).contains(_8_id)) && (!(_5_tasksToRemove).contains(_8_id))) {
                    _coll1.push([_8_id,((m).dtor_taskData).get(_8_id)]);
                  }
                }
              }
              return _coll1;
            }();
            let _9_newLists = TodoDomain.__default.RemoveFirst((m).dtor_lists, _4_listId);
            let _10_newListNames = ((m).dtor_listNames).Subtract(_dafny.Set.fromElements(_4_listId));
            let _11_newTasks = ((m).dtor_tasks).Subtract(_dafny.Set.fromElements(_4_listId));
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, _9_newLists, _10_newListNames, _11_newTasks, _7_newTaskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_MoveList) {
          let _12_listId = (_source0).listId;
          let _13_listPlace = (_source0).listPlace;
          if (!(TodoDomain.__default.SeqContains((m).dtor_lists, _12_listId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingList());
          } else {
            let _14_lists1 = TodoDomain.__default.RemoveFirst((m).dtor_lists, _12_listId);
            let _15_pos = TodoDomain.__default.PosFromListPlace(_14_lists1, _13_listPlace);
            if ((_15_pos).isLessThan(_dafny.ZERO)) {
              return TodoDomain.Result.create_Err(TodoDomain.Err.create_BadAnchor());
            } else {
              let _16_k = TodoDomain.__default.ClampPos(_15_pos, new BigNumber((_14_lists1).length));
              let _17_newLists = TodoDomain.__default.InsertAt(_14_lists1, _16_k, _12_listId);
              return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, _17_newLists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
            }
          }
        }
      }
      {
        if (_source0.is_AddTask) {
          let _18_listId = (_source0).listId;
          let _19_title = (_source0).title;
          if (!(TodoDomain.__default.SeqContains((m).dtor_lists, _18_listId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingList());
          } else if (TodoDomain.__default.TaskTitleExistsInList(m, _18_listId, _19_title, TodoDomain.Option.create_None())) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateTask());
          } else {
            let _20_id = (m).dtor_nextTaskId;
            let _21_newTask = TodoDomain.Task.create_Task(_19_title, _dafny.Seq.UnicodeFromString(""), false, false, TodoDomain.Option.create_None(), _dafny.Set.fromElements(), _dafny.Set.fromElements(), false, TodoDomain.Option.create_None(), TodoDomain.Option.create_None());
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, ((m).dtor_tasks).update(_18_listId, _dafny.Seq.Concat(TodoDomain.__default.TaskList(m, _18_listId), _dafny.Seq.of(_20_id))), ((m).dtor_taskData).update(_20_id, _21_newTask), (m).dtor_tags, (m).dtor_nextListId, ((m).dtor_nextTaskId).plus(_dafny.ONE), (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_EditTask) {
          let _22_taskId = (_source0).taskId;
          let _23_title = (_source0).title;
          let _24_notes = (_source0).notes;
          if (!(((m).dtor_taskData).contains(_22_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_22_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _25_currentList = TodoDomain.__default.FindListForTask(m, _22_taskId);
            if (((_25_currentList).is_Some) && (TodoDomain.__default.TaskTitleExistsInList(m, (_25_currentList).dtor_value, _23_title, TodoDomain.Option.create_Some(_22_taskId)))) {
              return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateTask());
            } else {
              let _26_t = ((m).dtor_taskData).get(_22_taskId);
              let _27_updated = TodoDomain.Task.create_Task(_23_title, _24_notes, (_26_t).dtor_completed, (_26_t).dtor_starred, (_26_t).dtor_dueDate, (_26_t).dtor_assignees, (_26_t).dtor_tags, (_26_t).dtor_deleted, (_26_t).dtor_deletedBy, (_26_t).dtor_deletedFromList);
              return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_22_taskId, _27_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
            }
          }
        }
      }
      {
        if (_source0.is_DeleteTask) {
          let _28_taskId = (_source0).taskId;
          let _29_userId = (_source0).userId;
          if (!(((m).dtor_taskData).contains(_28_taskId))) {
            return TodoDomain.Result.create_Ok(m);
          } else if ((((m).dtor_taskData).get(_28_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Ok(m);
          } else {
            let _30_t = ((m).dtor_taskData).get(_28_taskId);
            let _31_fromList = TodoDomain.__default.FindListForTask(m, _28_taskId);
            let _32_updated = TodoDomain.Task.create_Task((_30_t).dtor_title, (_30_t).dtor_notes, (_30_t).dtor_completed, (_30_t).dtor_starred, (_30_t).dtor_dueDate, (_30_t).dtor_assignees, (_30_t).dtor_tags, true, TodoDomain.Option.create_Some(_29_userId), _31_fromList);
            let _33_newTasks = function () {
              let _coll2 = new _dafny.Map();
              for (const _compr_2 of ((m).dtor_tasks).Keys.Elements) {
                let _34_l = _compr_2;
                if (_System.nat._Is(_34_l)) {
                  if (((m).dtor_tasks).contains(_34_l)) {
                    _coll2.push([_34_l,TodoDomain.__default.RemoveFirst(((m).dtor_tasks).get(_34_l), _28_taskId)]);
                  }
                }
              }
              return _coll2;
            }();
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, _33_newTasks, ((m).dtor_taskData).update(_28_taskId, _32_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_RestoreTask) {
          let _35_taskId = (_source0).taskId;
          if (!(((m).dtor_taskData).contains(_35_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if (!((((m).dtor_taskData).get(_35_taskId)).dtor_deleted)) {
            return TodoDomain.Result.create_Ok(m);
          } else if ((new BigNumber(((m).dtor_lists).length)).isEqualTo(_dafny.ZERO)) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingList());
          } else {
            let _36_t = ((m).dtor_taskData).get(_35_taskId);
            let _37_targetList = (((((_36_t).dtor_deletedFromList).is_Some) && (TodoDomain.__default.SeqContains((m).dtor_lists, ((_36_t).dtor_deletedFromList).dtor_value))) ? (((_36_t).dtor_deletedFromList).dtor_value) : (((m).dtor_lists)[_dafny.ZERO]));
            if (TodoDomain.__default.TaskTitleExistsInList(m, _37_targetList, (_36_t).dtor_title, TodoDomain.Option.create_None())) {
              return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateTask());
            } else {
              let _38_updated = TodoDomain.Task.create_Task((_36_t).dtor_title, (_36_t).dtor_notes, (_36_t).dtor_completed, (_36_t).dtor_starred, (_36_t).dtor_dueDate, (_36_t).dtor_assignees, (_36_t).dtor_tags, false, TodoDomain.Option.create_None(), TodoDomain.Option.create_None());
              return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, ((m).dtor_tasks).update(_37_targetList, _dafny.Seq.Concat(TodoDomain.__default.TaskList(m, _37_targetList), _dafny.Seq.of(_35_taskId))), ((m).dtor_taskData).update(_35_taskId, _38_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
            }
          }
        }
      }
      {
        if (_source0.is_MoveTask) {
          let _39_taskId = (_source0).taskId;
          let _40_toList = (_source0).toList;
          let _41_taskPlace = (_source0).taskPlace;
          if (!(((m).dtor_taskData).contains(_39_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_39_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else if (!(TodoDomain.__default.SeqContains((m).dtor_lists, _40_toList))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingList());
          } else if (TodoDomain.__default.TaskTitleExistsInList(m, _40_toList, (((m).dtor_taskData).get(_39_taskId)).dtor_title, TodoDomain.Option.create_Some(_39_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateTask());
          } else {
            let _42_tasks1 = function () {
              let _coll3 = new _dafny.Map();
              for (const _compr_3 of ((m).dtor_tasks).Keys.Elements) {
                let _43_l = _compr_3;
                if (((m).dtor_tasks).contains(_43_l)) {
                  _coll3.push([_43_l,TodoDomain.__default.RemoveFirst(((m).dtor_tasks).get(_43_l), _39_taskId)]);
                }
              }
              return _coll3;
            }();
            let _44_tgt = TodoDomain.__default.Get(_42_tasks1, _40_toList, _dafny.Seq.of());
            let _45_pos = TodoDomain.__default.PosFromPlace(_44_tgt, _41_taskPlace);
            if ((_45_pos).isLessThan(_dafny.ZERO)) {
              return TodoDomain.Result.create_Err(TodoDomain.Err.create_BadAnchor());
            } else {
              let _46_k = TodoDomain.__default.ClampPos(_45_pos, new BigNumber((_44_tgt).length));
              let _47_tgt2 = TodoDomain.__default.InsertAt(_44_tgt, _46_k, _39_taskId);
              return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (_42_tasks1).update(_40_toList, _47_tgt2), (m).dtor_taskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
            }
          }
        }
      }
      {
        if (_source0.is_CompleteTask) {
          let _48_taskId = (_source0).taskId;
          if (!(((m).dtor_taskData).contains(_48_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_48_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _49_t = ((m).dtor_taskData).get(_48_taskId);
            let _50_updated = TodoDomain.Task.create_Task((_49_t).dtor_title, (_49_t).dtor_notes, true, (_49_t).dtor_starred, (_49_t).dtor_dueDate, (_49_t).dtor_assignees, (_49_t).dtor_tags, (_49_t).dtor_deleted, (_49_t).dtor_deletedBy, (_49_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_48_taskId, _50_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_UncompleteTask) {
          let _51_taskId = (_source0).taskId;
          if (!(((m).dtor_taskData).contains(_51_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_51_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _52_t = ((m).dtor_taskData).get(_51_taskId);
            let _53_updated = TodoDomain.Task.create_Task((_52_t).dtor_title, (_52_t).dtor_notes, false, (_52_t).dtor_starred, (_52_t).dtor_dueDate, (_52_t).dtor_assignees, (_52_t).dtor_tags, (_52_t).dtor_deleted, (_52_t).dtor_deletedBy, (_52_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_51_taskId, _53_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_StarTask) {
          let _54_taskId = (_source0).taskId;
          if (!(((m).dtor_taskData).contains(_54_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_54_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _55_t = ((m).dtor_taskData).get(_54_taskId);
            let _56_updated = TodoDomain.Task.create_Task((_55_t).dtor_title, (_55_t).dtor_notes, (_55_t).dtor_completed, true, (_55_t).dtor_dueDate, (_55_t).dtor_assignees, (_55_t).dtor_tags, (_55_t).dtor_deleted, (_55_t).dtor_deletedBy, (_55_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_54_taskId, _56_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_UnstarTask) {
          let _57_taskId = (_source0).taskId;
          if (!(((m).dtor_taskData).contains(_57_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_57_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _58_t = ((m).dtor_taskData).get(_57_taskId);
            let _59_updated = TodoDomain.Task.create_Task((_58_t).dtor_title, (_58_t).dtor_notes, (_58_t).dtor_completed, false, (_58_t).dtor_dueDate, (_58_t).dtor_assignees, (_58_t).dtor_tags, (_58_t).dtor_deleted, (_58_t).dtor_deletedBy, (_58_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_57_taskId, _59_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_SetDueDate) {
          let _60_taskId = (_source0).taskId;
          let _61_dueDate = (_source0).dueDate;
          if (!(((m).dtor_taskData).contains(_60_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_60_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else if (((_61_dueDate).is_Some) && (!(TodoDomain.__default.ValidDate((_61_dueDate).dtor_value)))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_InvalidDate());
          } else {
            let _62_t = ((m).dtor_taskData).get(_60_taskId);
            let _63_updated = TodoDomain.Task.create_Task((_62_t).dtor_title, (_62_t).dtor_notes, (_62_t).dtor_completed, (_62_t).dtor_starred, _61_dueDate, (_62_t).dtor_assignees, (_62_t).dtor_tags, (_62_t).dtor_deleted, (_62_t).dtor_deletedBy, (_62_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_60_taskId, _63_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_AssignTask) {
          let _64_taskId = (_source0).taskId;
          let _65_userId = (_source0).userId;
          if (!(((m).dtor_taskData).contains(_64_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_64_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else if (!(((m).dtor_members).contains(_65_userId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_NotAMember());
          } else {
            let _66_t = ((m).dtor_taskData).get(_64_taskId);
            let _67_updated = TodoDomain.Task.create_Task((_66_t).dtor_title, (_66_t).dtor_notes, (_66_t).dtor_completed, (_66_t).dtor_starred, (_66_t).dtor_dueDate, ((_66_t).dtor_assignees).Union(_dafny.Set.fromElements(_65_userId)), (_66_t).dtor_tags, (_66_t).dtor_deleted, (_66_t).dtor_deletedBy, (_66_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_64_taskId, _67_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_UnassignTask) {
          let _68_taskId = (_source0).taskId;
          let _69_userId = (_source0).userId;
          if (!(((m).dtor_taskData).contains(_68_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_68_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _70_t = ((m).dtor_taskData).get(_68_taskId);
            let _71_updated = TodoDomain.Task.create_Task((_70_t).dtor_title, (_70_t).dtor_notes, (_70_t).dtor_completed, (_70_t).dtor_starred, (_70_t).dtor_dueDate, ((_70_t).dtor_assignees).Difference(_dafny.Set.fromElements(_69_userId)), (_70_t).dtor_tags, (_70_t).dtor_deleted, (_70_t).dtor_deletedBy, (_70_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_68_taskId, _71_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_AddTagToTask) {
          let _72_taskId = (_source0).taskId;
          let _73_tagId = (_source0).tagId;
          if (!(((m).dtor_taskData).contains(_72_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_72_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else if (!(((m).dtor_tags).contains(_73_tagId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTag());
          } else {
            let _74_t = ((m).dtor_taskData).get(_72_taskId);
            let _75_updated = TodoDomain.Task.create_Task((_74_t).dtor_title, (_74_t).dtor_notes, (_74_t).dtor_completed, (_74_t).dtor_starred, (_74_t).dtor_dueDate, (_74_t).dtor_assignees, ((_74_t).dtor_tags).Union(_dafny.Set.fromElements(_73_tagId)), (_74_t).dtor_deleted, (_74_t).dtor_deletedBy, (_74_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_72_taskId, _75_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_RemoveTagFromTask) {
          let _76_taskId = (_source0).taskId;
          let _77_tagId = (_source0).tagId;
          if (!(((m).dtor_taskData).contains(_76_taskId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTask());
          } else if ((((m).dtor_taskData).get(_76_taskId)).dtor_deleted) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_TaskDeleted());
          } else {
            let _78_t = ((m).dtor_taskData).get(_76_taskId);
            let _79_updated = TodoDomain.Task.create_Task((_78_t).dtor_title, (_78_t).dtor_notes, (_78_t).dtor_completed, (_78_t).dtor_starred, (_78_t).dtor_dueDate, (_78_t).dtor_assignees, ((_78_t).dtor_tags).Difference(_dafny.Set.fromElements(_77_tagId)), (_78_t).dtor_deleted, (_78_t).dtor_deletedBy, (_78_t).dtor_deletedFromList);
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, ((m).dtor_taskData).update(_76_taskId, _79_updated), (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_CreateTag) {
          let _80_name = (_source0).name;
          if (TodoDomain.__default.TagNameExists(m, _80_name, TodoDomain.Option.create_None())) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateTag());
          } else {
            let _81_id = (m).dtor_nextTagId;
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, ((m).dtor_tags).update(_81_id, TodoDomain.Tag.create_Tag(_80_name)), (m).dtor_nextListId, (m).dtor_nextTaskId, ((m).dtor_nextTagId).plus(_dafny.ONE)));
          }
        }
      }
      {
        if (_source0.is_RenameTag) {
          let _82_tagId = (_source0).tagId;
          let _83_newName = (_source0).newName;
          if (!(((m).dtor_tags).contains(_82_tagId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_MissingTag());
          } else if (TodoDomain.__default.TagNameExists(m, _83_newName, TodoDomain.Option.create_Some(_82_tagId))) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_DuplicateTag());
          } else {
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, ((m).dtor_tags).update(_82_tagId, TodoDomain.Tag.create_Tag(_83_newName)), (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_DeleteTag) {
          let _84_tagId = (_source0).tagId;
          if (!(((m).dtor_tags).contains(_84_tagId))) {
            return TodoDomain.Result.create_Ok(m);
          } else {
            let _85_newTaskData = TodoDomain.__default.RemoveTagFromAllTasks((m).dtor_taskData, _84_tagId);
            let _86_newTags = ((m).dtor_tags).Subtract(_dafny.Set.fromElements(_84_tagId));
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, _85_newTaskData, _86_newTags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_MakeCollaborative) {
          if (((m).dtor_mode).is_Collaborative) {
            return TodoDomain.Result.create_Ok(m);
          } else {
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model(TodoDomain.ProjectMode.create_Collaborative(), (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        if (_source0.is_AddMember) {
          let _87_userId = (_source0).userId;
          if (((m).dtor_mode).is_Personal) {
            return TodoDomain.Result.create_Err(TodoDomain.Err.create_PersonalProject());
          } else if (((m).dtor_members).contains(_87_userId)) {
            return TodoDomain.Result.create_Ok(m);
          } else {
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, ((m).dtor_members).Union(_dafny.Set.fromElements(_87_userId)), (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
          }
        }
      }
      {
        let _88_userId = (_source0).userId;
        if (_dafny.areEqual(_88_userId, (m).dtor_owner)) {
          return TodoDomain.Result.create_Err(TodoDomain.Err.create_CannotRemoveOwner());
        } else if (!(((m).dtor_members).contains(_88_userId))) {
          return TodoDomain.Result.create_Ok(m);
        } else {
          let _89_newTaskData = TodoDomain.__default.ClearAssigneeFromAllTasks((m).dtor_taskData, _88_userId);
          return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, ((m).dtor_members).Difference(_dafny.Set.fromElements(_88_userId)), (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, _89_newTaskData, (m).dtor_tags, (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
        }
      }
    };
    static DegradeIfAnchorMoved(movedId, p) {
      let _source0 = p;
      {
        if (_source0.is_AtEnd) {
          return TodoDomain.Place.create_AtEnd();
        }
      }
      {
        if (_source0.is_Before) {
          let _0_a = (_source0).anchor;
          if ((_0_a).isEqualTo(movedId)) {
            return TodoDomain.Place.create_AtEnd();
          } else {
            return p;
          }
        }
      }
      {
        let _1_a = (_source0).anchor;
        if ((_1_a).isEqualTo(movedId)) {
          return TodoDomain.Place.create_AtEnd();
        } else {
          return p;
        }
      }
    };
    static DegradeIfListAnchorMoved(movedId, p) {
      let _source0 = p;
      {
        if (_source0.is_ListAtEnd) {
          return TodoDomain.ListPlace.create_ListAtEnd();
        }
      }
      {
        if (_source0.is_ListBefore) {
          let _0_a = (_source0).anchor;
          if ((_0_a).isEqualTo(movedId)) {
            return TodoDomain.ListPlace.create_ListAtEnd();
          } else {
            return p;
          }
        }
      }
      {
        let _1_a = (_source0).anchor;
        if ((_1_a).isEqualTo(movedId)) {
          return TodoDomain.ListPlace.create_ListAtEnd();
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
          return TodoDomain.Action.create_NoOp();
        }
      }
      {
        let _01 = (_source0)[0];
        if (_01.is_DeleteTask) {
          let _0_rid = (_01).taskId;
          let _11 = (_source0)[1];
          if (_11.is_EditTask) {
            let _1_lid = (_11).taskId;
            if ((_0_rid).isEqualTo(_1_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _02 = (_source0)[0];
        if (_02.is_DeleteTask) {
          let _2_rid = (_02).taskId;
          let _12 = (_source0)[1];
          if (_12.is_MoveTask) {
            let _3_lid = (_12).taskId;
            if ((_2_rid).isEqualTo(_3_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _03 = (_source0)[0];
        if (_03.is_DeleteTask) {
          let _4_rid = (_03).taskId;
          let _13 = (_source0)[1];
          if (_13.is_CompleteTask) {
            let _5_lid = (_13).taskId;
            if ((_4_rid).isEqualTo(_5_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _04 = (_source0)[0];
        if (_04.is_DeleteTask) {
          let _6_rid = (_04).taskId;
          let _14 = (_source0)[1];
          if (_14.is_UncompleteTask) {
            let _7_lid = (_14).taskId;
            if ((_6_rid).isEqualTo(_7_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _05 = (_source0)[0];
        if (_05.is_DeleteTask) {
          let _8_rid = (_05).taskId;
          let _15 = (_source0)[1];
          if (_15.is_StarTask) {
            let _9_lid = (_15).taskId;
            if ((_8_rid).isEqualTo(_9_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _06 = (_source0)[0];
        if (_06.is_DeleteTask) {
          let _10_rid = (_06).taskId;
          let _16 = (_source0)[1];
          if (_16.is_UnstarTask) {
            let _11_lid = (_16).taskId;
            if ((_10_rid).isEqualTo(_11_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _07 = (_source0)[0];
        if (_07.is_DeleteTask) {
          let _12_rid = (_07).taskId;
          let _17 = (_source0)[1];
          if (_17.is_SetDueDate) {
            let _13_lid = (_17).taskId;
            if ((_12_rid).isEqualTo(_13_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _08 = (_source0)[0];
        if (_08.is_DeleteTask) {
          let _14_rid = (_08).taskId;
          let _18 = (_source0)[1];
          if (_18.is_AssignTask) {
            let _15_lid = (_18).taskId;
            if ((_14_rid).isEqualTo(_15_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _09 = (_source0)[0];
        if (_09.is_DeleteTask) {
          let _16_rid = (_09).taskId;
          let _19 = (_source0)[1];
          if (_19.is_UnassignTask) {
            let _17_lid = (_19).taskId;
            if ((_16_rid).isEqualTo(_17_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _010 = (_source0)[0];
        if (_010.is_DeleteTask) {
          let _18_rid = (_010).taskId;
          let _110 = (_source0)[1];
          if (_110.is_AddTagToTask) {
            let _19_lid = (_110).taskId;
            if ((_18_rid).isEqualTo(_19_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _011 = (_source0)[0];
        if (_011.is_DeleteTask) {
          let _20_rid = (_011).taskId;
          let _111 = (_source0)[1];
          if (_111.is_RemoveTagFromTask) {
            let _21_lid = (_111).taskId;
            if ((_20_rid).isEqualTo(_21_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _012 = (_source0)[0];
        if (_012.is_RemoveMember) {
          let _22_ruid = (_012).userId;
          let _112 = (_source0)[1];
          if (_112.is_AssignTask) {
            let _23_taskId = (_112).taskId;
            let _24_luid = (_112).userId;
            if (_dafny.areEqual(_22_ruid, _24_luid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _013 = (_source0)[0];
        if (_013.is_MoveList) {
          let _25_rid = (_013).listId;
          let _113 = (_source0)[1];
          if (_113.is_MoveList) {
            let _26_lid = (_113).listId;
            if ((_25_rid).isEqualTo(_26_lid)) {
              return TodoDomain.Action.create_NoOp();
            } else {
              return local;
            }
          }
        }
      }
      {
        let _014 = (_source0)[0];
        if (_014.is_MoveTask) {
          let _27_rid = (_014).taskId;
          let _114 = (_source0)[1];
          if (_114.is_MoveTask) {
            let _28_lid = (_114).taskId;
            let _29_ltoList = (_114).toList;
            let _30_lplace = (_114).taskPlace;
            if ((_27_rid).isEqualTo(_28_lid)) {
              return local;
            } else {
              return TodoDomain.Action.create_MoveTask(_28_lid, _29_ltoList, TodoDomain.__default.DegradeIfAnchorMoved(_27_rid, _30_lplace));
            }
          }
        }
      }
      {
        let _015 = (_source0)[0];
        if (_015.is_EditTask) {
          let _115 = (_source0)[1];
          if (_115.is_EditTask) {
            return local;
          }
        }
      }
      {
        let _016 = (_source0)[0];
        if (_016.is_CompleteTask) {
          let _116 = (_source0)[1];
          if (_116.is_CompleteTask) {
            return local;
          }
        }
      }
      {
        let _017 = (_source0)[0];
        if (_017.is_UncompleteTask) {
          let _117 = (_source0)[1];
          if (_117.is_UncompleteTask) {
            return local;
          }
        }
      }
      {
        let _018 = (_source0)[0];
        if (_018.is_StarTask) {
          let _118 = (_source0)[1];
          if (_118.is_StarTask) {
            return local;
          }
        }
      }
      {
        let _019 = (_source0)[0];
        if (_019.is_UnstarTask) {
          let _119 = (_source0)[1];
          if (_119.is_UnstarTask) {
            return local;
          }
        }
      }
      {
        let _020 = (_source0)[0];
        if (_020.is_AssignTask) {
          let _120 = (_source0)[1];
          if (_120.is_AssignTask) {
            return local;
          }
        }
      }
      {
        let _021 = (_source0)[0];
        if (_021.is_UnassignTask) {
          let _121 = (_source0)[1];
          if (_121.is_UnassignTask) {
            return local;
          }
        }
      }
      {
        let _022 = (_source0)[0];
        if (_022.is_SetDueDate) {
          let _122 = (_source0)[1];
          if (_122.is_SetDueDate) {
            return local;
          }
        }
      }
      {
        return local;
      }
    };
    static Candidates(m, a) {
      let _source0 = a;
      {
        if (_source0.is_MoveTask) {
          let _0_id = (_source0).taskId;
          let _1_toList = (_source0).toList;
          let _2_taskPlace = (_source0).taskPlace;
          let _3_lane = TodoDomain.__default.TaskList(m, _1_toList);
          if (_dafny.areEqual(_2_taskPlace, TodoDomain.Place.create_AtEnd())) {
            return _dafny.Seq.of(TodoDomain.Action.create_MoveTask(_0_id, _1_toList, TodoDomain.Place.create_AtEnd()));
          } else if ((new BigNumber((_3_lane).length)).isEqualTo(_dafny.ZERO)) {
            return _dafny.Seq.of(TodoDomain.Action.create_MoveTask(_0_id, _1_toList, _2_taskPlace), TodoDomain.Action.create_MoveTask(_0_id, _1_toList, TodoDomain.Place.create_AtEnd()));
          } else {
            let _4_first = (_3_lane)[_dafny.ZERO];
            return _dafny.Seq.of(TodoDomain.Action.create_MoveTask(_0_id, _1_toList, _2_taskPlace), TodoDomain.Action.create_MoveTask(_0_id, _1_toList, TodoDomain.Place.create_AtEnd()), TodoDomain.Action.create_MoveTask(_0_id, _1_toList, TodoDomain.Place.create_Before(_4_first)));
          }
        }
      }
      {
        if (_source0.is_MoveList) {
          let _5_id = (_source0).listId;
          let _6_listPlace = (_source0).listPlace;
          if (_dafny.areEqual(_6_listPlace, TodoDomain.ListPlace.create_ListAtEnd())) {
            return _dafny.Seq.of(TodoDomain.Action.create_MoveList(_5_id, TodoDomain.ListPlace.create_ListAtEnd()));
          } else if ((new BigNumber(((m).dtor_lists).length)).isEqualTo(_dafny.ZERO)) {
            return _dafny.Seq.of(TodoDomain.Action.create_MoveList(_5_id, _6_listPlace), TodoDomain.Action.create_MoveList(_5_id, TodoDomain.ListPlace.create_ListAtEnd()));
          } else {
            let _7_first = ((m).dtor_lists)[_dafny.ZERO];
            return _dafny.Seq.of(TodoDomain.Action.create_MoveList(_5_id, _6_listPlace), TodoDomain.Action.create_MoveList(_5_id, TodoDomain.ListPlace.create_ListAtEnd()), TodoDomain.Action.create_MoveList(_5_id, TodoDomain.ListPlace.create_ListBefore(_7_first)));
          }
        }
      }
      {
        return _dafny.Seq.of(a);
      }
    };
    static IsPriorityTask(t) {
      return (((t).dtor_starred) && (!((t).dtor_completed))) && (!((t).dtor_deleted));
    };
    static IsLogbookTask(t) {
      return ((t).dtor_completed) && (!((t).dtor_deleted));
    };
    static IsVisibleTask(t) {
      return !((t).dtor_deleted);
    };
    static MatchesSmartList(t, smartList) {
      let _source0 = smartList;
      {
        if (_source0.is_Priority) {
          return TodoDomain.__default.IsPriorityTask(t);
        }
      }
      {
        return TodoDomain.__default.IsLogbookTask(t);
      }
    };
    static GetVisibleTaskIds(m) {
      return function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of ((m).dtor_taskData).Keys.Elements) {
          let _0_id = _compr_0;
          if (_System.nat._Is(_0_id)) {
            if ((((m).dtor_taskData).contains(_0_id)) && (TodoDomain.__default.IsVisibleTask(((m).dtor_taskData).get(_0_id)))) {
              _coll0.add(_0_id);
            }
          }
        }
        return _coll0;
      }();
    };
    static GetSmartListTaskIds(m, smartList) {
      return function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of ((m).dtor_taskData).Keys.Elements) {
          let _0_id = _compr_0;
          if (_System.nat._Is(_0_id)) {
            if ((((m).dtor_taskData).contains(_0_id)) && (TodoDomain.__default.MatchesSmartList(((m).dtor_taskData).get(_0_id), smartList))) {
              _coll0.add(_0_id);
            }
          }
        }
        return _coll0;
      }();
    };
    static GetPriorityTaskIds(m) {
      return function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of ((m).dtor_taskData).Keys.Elements) {
          let _0_id = _compr_0;
          if (_System.nat._Is(_0_id)) {
            if ((((m).dtor_taskData).contains(_0_id)) && (TodoDomain.__default.IsPriorityTask(((m).dtor_taskData).get(_0_id)))) {
              _coll0.add(_0_id);
            }
          }
        }
        return _coll0;
      }();
    };
    static GetLogbookTaskIds(m) {
      return function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of ((m).dtor_taskData).Keys.Elements) {
          let _0_id = _compr_0;
          if (_System.nat._Is(_0_id)) {
            if ((((m).dtor_taskData).contains(_0_id)) && (TodoDomain.__default.IsLogbookTask(((m).dtor_taskData).get(_0_id)))) {
              _coll0.add(_0_id);
            }
          }
        }
        return _coll0;
      }();
    };
    static CountSmartListTasks(m, smartList) {
      return new BigNumber((TodoDomain.__default.GetSmartListTaskIds(m, smartList)).length);
    };
    static CountPriorityTasks(m) {
      return new BigNumber((TodoDomain.__default.GetPriorityTaskIds(m)).length);
    };
    static CountLogbookTasks(m) {
      return new BigNumber((TodoDomain.__default.GetLogbookTaskIds(m)).length);
    };
    static CountVisibleTasksInList(m, listId) {
      if (!((m).dtor_tasks).contains(listId)) {
        return _dafny.ZERO;
      } else {
        return TodoDomain.__default.CountVisibleInSeq(((m).dtor_tasks).get(listId), (m).dtor_taskData);
      }
    };
    static CountVisibleInSeq(ids, taskData) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((ids).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          let _1_head = (ids)[_dafny.ZERO];
          let _2_countHead = ((((taskData).contains(_1_head)) && (TodoDomain.__default.IsVisibleTask((taskData).get(_1_head)))) ? (_dafny.ONE) : (_dafny.ZERO));
          _0___accumulator = (_0___accumulator).plus(_2_countHead);
          let _in0 = (ids).slice(_dafny.ONE);
          let _in1 = taskData;
          ids = _in0;
          taskData = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static GetTask(m, taskId) {
      if ((((m).dtor_taskData).contains(taskId)) && (TodoDomain.__default.IsVisibleTask(((m).dtor_taskData).get(taskId)))) {
        return TodoDomain.Option.create_Some(((m).dtor_taskData).get(taskId));
      } else {
        return TodoDomain.Option.create_None();
      }
    };
    static GetTaskIncludingDeleted(m, taskId) {
      if (((m).dtor_taskData).contains(taskId)) {
        return TodoDomain.Option.create_Some(((m).dtor_taskData).get(taskId));
      } else {
        return TodoDomain.Option.create_None();
      }
    };
    static GetTasksInList(m, listId) {
      if (!((m).dtor_tasks).contains(listId)) {
        return _dafny.Seq.of();
      } else {
        return TodoDomain.__default.FilterVisibleTasks(((m).dtor_tasks).get(listId), (m).dtor_taskData);
      }
    };
    static FilterVisibleTasks(ids, taskData) {
      if ((new BigNumber((ids).length)).isEqualTo(_dafny.ZERO)) {
        return _dafny.Seq.of();
      } else {
        let _0_head = (ids)[_dafny.ZERO];
        let _1_rest = TodoDomain.__default.FilterVisibleTasks((ids).slice(_dafny.ONE), taskData);
        if (((taskData).contains(_0_head)) && (TodoDomain.__default.IsVisibleTask((taskData).get(_0_head)))) {
          return _dafny.Seq.Concat(_dafny.Seq.of(_0_head), _1_rest);
        } else {
          return _1_rest;
        }
      }
    };
    static GetListName(m, listId) {
      if (((m).dtor_listNames).contains(listId)) {
        return TodoDomain.Option.create_Some(((m).dtor_listNames).get(listId));
      } else {
        return TodoDomain.Option.create_None();
      }
    };
    static GetLists(m) {
      return (m).dtor_lists;
    };
    static GetTagName(m, tagId) {
      if (((m).dtor_tags).contains(tagId)) {
        return TodoDomain.Option.create_Some((((m).dtor_tags).get(tagId)).dtor_name);
      } else {
        return TodoDomain.Option.create_None();
      }
    };
    static GetTags(m) {
      return ((m).dtor_tags).Keys;
    };
    static RebaseThroughSuffix(suffix, a) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((suffix).length)).isEqualTo(_dafny.ZERO)) {
          return a;
        } else {
          let _in0 = (suffix).slice(0, (new BigNumber((suffix).length)).minus(_dafny.ONE));
          let _in1 = TodoDomain.__default.Rebase((suffix)[(new BigNumber((suffix).length)).minus(_dafny.ONE)], a);
          suffix = _in0;
          a = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static get InitialOwner() {
      return _dafny.Seq.UnicodeFromString("");
    };
  };

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
        return "TodoDomain.Option.None";
      } else if (this.\$tag === 1) {
        return "TodoDomain.Option.Some" + "(" + _dafny.toString(this.value) + ")";
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
      return TodoDomain.Option.create_None();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Option.Default();
        }
      };
    }
  }

  \$module.Date = class Date {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Date(year, month, day) {
      let \$dt = new Date(0);
      \$dt.year = year;
      \$dt.month = month;
      \$dt.day = day;
      return \$dt;
    }
    get is_Date() { return this.\$tag === 0; }
    get dtor_year() { return this.year; }
    get dtor_month() { return this.month; }
    get dtor_day() { return this.day; }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.Date.Date" + "(" + _dafny.toString(this.year) + ", " + _dafny.toString(this.month) + ", " + _dafny.toString(this.day) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.year, other.year) && _dafny.areEqual(this.month, other.month) && _dafny.areEqual(this.day, other.day);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.Date.create_Date(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Date.Default();
        }
      };
    }
  }

  \$module.Task = class Task {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Task(title, notes, completed, starred, dueDate, assignees, tags, deleted, deletedBy, deletedFromList) {
      let \$dt = new Task(0);
      \$dt.title = title;
      \$dt.notes = notes;
      \$dt.completed = completed;
      \$dt.starred = starred;
      \$dt.dueDate = dueDate;
      \$dt.assignees = assignees;
      \$dt.tags = tags;
      \$dt.deleted = deleted;
      \$dt.deletedBy = deletedBy;
      \$dt.deletedFromList = deletedFromList;
      return \$dt;
    }
    get is_Task() { return this.\$tag === 0; }
    get dtor_title() { return this.title; }
    get dtor_notes() { return this.notes; }
    get dtor_completed() { return this.completed; }
    get dtor_starred() { return this.starred; }
    get dtor_dueDate() { return this.dueDate; }
    get dtor_assignees() { return this.assignees; }
    get dtor_tags() { return this.tags; }
    get dtor_deleted() { return this.deleted; }
    get dtor_deletedBy() { return this.deletedBy; }
    get dtor_deletedFromList() { return this.deletedFromList; }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.Task.Task" + "(" + this.title.toVerbatimString(true) + ", " + this.notes.toVerbatimString(true) + ", " + _dafny.toString(this.completed) + ", " + _dafny.toString(this.starred) + ", " + _dafny.toString(this.dueDate) + ", " + _dafny.toString(this.assignees) + ", " + _dafny.toString(this.tags) + ", " + _dafny.toString(this.deleted) + ", " + _dafny.toString(this.deletedBy) + ", " + _dafny.toString(this.deletedFromList) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.title, other.title) && _dafny.areEqual(this.notes, other.notes) && this.completed === other.completed && this.starred === other.starred && _dafny.areEqual(this.dueDate, other.dueDate) && _dafny.areEqual(this.assignees, other.assignees) && _dafny.areEqual(this.tags, other.tags) && this.deleted === other.deleted && _dafny.areEqual(this.deletedBy, other.deletedBy) && _dafny.areEqual(this.deletedFromList, other.deletedFromList);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.Task.create_Task(_dafny.Seq.UnicodeFromString(""), _dafny.Seq.UnicodeFromString(""), false, false, TodoDomain.Option.Default(), _dafny.Set.Empty, _dafny.Set.Empty, false, TodoDomain.Option.Default(), TodoDomain.Option.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Task.Default();
        }
      };
    }
  }

  \$module.Tag = class Tag {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Tag(name) {
      let \$dt = new Tag(0);
      \$dt.name = name;
      return \$dt;
    }
    get is_Tag() { return this.\$tag === 0; }
    get dtor_name() { return this.name; }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.Tag.Tag" + "(" + this.name.toVerbatimString(true) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.name, other.name);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.Tag.create_Tag(_dafny.Seq.UnicodeFromString(""));
    }
    static Rtd() {
      return class {
        static get Default() {
          return Tag.Default();
        }
      };
    }
  }

  \$module.ProjectMode = class ProjectMode {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Personal() {
      let \$dt = new ProjectMode(0);
      return \$dt;
    }
    static create_Collaborative() {
      let \$dt = new ProjectMode(1);
      return \$dt;
    }
    get is_Personal() { return this.\$tag === 0; }
    get is_Collaborative() { return this.\$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield ProjectMode.create_Personal();
      yield ProjectMode.create_Collaborative();
    }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.ProjectMode.Personal";
      } else if (this.\$tag === 1) {
        return "TodoDomain.ProjectMode.Collaborative";
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
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.ProjectMode.create_Personal();
    }
    static Rtd() {
      return class {
        static get Default() {
          return ProjectMode.Default();
        }
      };
    }
  }

  \$module.Model = class Model {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Model(mode, owner, members, lists, listNames, tasks, taskData, tags, nextListId, nextTaskId, nextTagId) {
      let \$dt = new Model(0);
      \$dt.mode = mode;
      \$dt.owner = owner;
      \$dt.members = members;
      \$dt.lists = lists;
      \$dt.listNames = listNames;
      \$dt.tasks = tasks;
      \$dt.taskData = taskData;
      \$dt.tags = tags;
      \$dt.nextListId = nextListId;
      \$dt.nextTaskId = nextTaskId;
      \$dt.nextTagId = nextTagId;
      return \$dt;
    }
    get is_Model() { return this.\$tag === 0; }
    get dtor_mode() { return this.mode; }
    get dtor_owner() { return this.owner; }
    get dtor_members() { return this.members; }
    get dtor_lists() { return this.lists; }
    get dtor_listNames() { return this.listNames; }
    get dtor_tasks() { return this.tasks; }
    get dtor_taskData() { return this.taskData; }
    get dtor_tags() { return this.tags; }
    get dtor_nextListId() { return this.nextListId; }
    get dtor_nextTaskId() { return this.nextTaskId; }
    get dtor_nextTagId() { return this.nextTagId; }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.Model.Model" + "(" + _dafny.toString(this.mode) + ", " + this.owner.toVerbatimString(true) + ", " + _dafny.toString(this.members) + ", " + _dafny.toString(this.lists) + ", " + _dafny.toString(this.listNames) + ", " + _dafny.toString(this.tasks) + ", " + _dafny.toString(this.taskData) + ", " + _dafny.toString(this.tags) + ", " + _dafny.toString(this.nextListId) + ", " + _dafny.toString(this.nextTaskId) + ", " + _dafny.toString(this.nextTagId) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.\$tag === 0) {
        return other.\$tag === 0 && _dafny.areEqual(this.mode, other.mode) && _dafny.areEqual(this.owner, other.owner) && _dafny.areEqual(this.members, other.members) && _dafny.areEqual(this.lists, other.lists) && _dafny.areEqual(this.listNames, other.listNames) && _dafny.areEqual(this.tasks, other.tasks) && _dafny.areEqual(this.taskData, other.taskData) && _dafny.areEqual(this.tags, other.tags) && _dafny.areEqual(this.nextListId, other.nextListId) && _dafny.areEqual(this.nextTaskId, other.nextTaskId) && _dafny.areEqual(this.nextTagId, other.nextTagId);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.Model.create_Model(TodoDomain.ProjectMode.Default(), _dafny.Seq.UnicodeFromString(""), _dafny.Set.Empty, _dafny.Seq.of(), _dafny.Map.Empty, _dafny.Map.Empty, _dafny.Map.Empty, _dafny.Map.Empty, _dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
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
    static create_MissingList() {
      let \$dt = new Err(0);
      return \$dt;
    }
    static create_MissingTask() {
      let \$dt = new Err(1);
      return \$dt;
    }
    static create_MissingTag() {
      let \$dt = new Err(2);
      return \$dt;
    }
    static create_MissingUser() {
      let \$dt = new Err(3);
      return \$dt;
    }
    static create_DuplicateList() {
      let \$dt = new Err(4);
      return \$dt;
    }
    static create_DuplicateTask() {
      let \$dt = new Err(5);
      return \$dt;
    }
    static create_DuplicateTag() {
      let \$dt = new Err(6);
      return \$dt;
    }
    static create_BadAnchor() {
      let \$dt = new Err(7);
      return \$dt;
    }
    static create_NotAMember() {
      let \$dt = new Err(8);
      return \$dt;
    }
    static create_PersonalProject() {
      let \$dt = new Err(9);
      return \$dt;
    }
    static create_AlreadyCollaborative() {
      let \$dt = new Err(10);
      return \$dt;
    }
    static create_CannotRemoveOwner() {
      let \$dt = new Err(11);
      return \$dt;
    }
    static create_TaskDeleted() {
      let \$dt = new Err(12);
      return \$dt;
    }
    static create_InvalidDate() {
      let \$dt = new Err(13);
      return \$dt;
    }
    static create_Rejected() {
      let \$dt = new Err(14);
      return \$dt;
    }
    get is_MissingList() { return this.\$tag === 0; }
    get is_MissingTask() { return this.\$tag === 1; }
    get is_MissingTag() { return this.\$tag === 2; }
    get is_MissingUser() { return this.\$tag === 3; }
    get is_DuplicateList() { return this.\$tag === 4; }
    get is_DuplicateTask() { return this.\$tag === 5; }
    get is_DuplicateTag() { return this.\$tag === 6; }
    get is_BadAnchor() { return this.\$tag === 7; }
    get is_NotAMember() { return this.\$tag === 8; }
    get is_PersonalProject() { return this.\$tag === 9; }
    get is_AlreadyCollaborative() { return this.\$tag === 10; }
    get is_CannotRemoveOwner() { return this.\$tag === 11; }
    get is_TaskDeleted() { return this.\$tag === 12; }
    get is_InvalidDate() { return this.\$tag === 13; }
    get is_Rejected() { return this.\$tag === 14; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Err.create_MissingList();
      yield Err.create_MissingTask();
      yield Err.create_MissingTag();
      yield Err.create_MissingUser();
      yield Err.create_DuplicateList();
      yield Err.create_DuplicateTask();
      yield Err.create_DuplicateTag();
      yield Err.create_BadAnchor();
      yield Err.create_NotAMember();
      yield Err.create_PersonalProject();
      yield Err.create_AlreadyCollaborative();
      yield Err.create_CannotRemoveOwner();
      yield Err.create_TaskDeleted();
      yield Err.create_InvalidDate();
      yield Err.create_Rejected();
    }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.Err.MissingList";
      } else if (this.\$tag === 1) {
        return "TodoDomain.Err.MissingTask";
      } else if (this.\$tag === 2) {
        return "TodoDomain.Err.MissingTag";
      } else if (this.\$tag === 3) {
        return "TodoDomain.Err.MissingUser";
      } else if (this.\$tag === 4) {
        return "TodoDomain.Err.DuplicateList";
      } else if (this.\$tag === 5) {
        return "TodoDomain.Err.DuplicateTask";
      } else if (this.\$tag === 6) {
        return "TodoDomain.Err.DuplicateTag";
      } else if (this.\$tag === 7) {
        return "TodoDomain.Err.BadAnchor";
      } else if (this.\$tag === 8) {
        return "TodoDomain.Err.NotAMember";
      } else if (this.\$tag === 9) {
        return "TodoDomain.Err.PersonalProject";
      } else if (this.\$tag === 10) {
        return "TodoDomain.Err.AlreadyCollaborative";
      } else if (this.\$tag === 11) {
        return "TodoDomain.Err.CannotRemoveOwner";
      } else if (this.\$tag === 12) {
        return "TodoDomain.Err.TaskDeleted";
      } else if (this.\$tag === 13) {
        return "TodoDomain.Err.InvalidDate";
      } else if (this.\$tag === 14) {
        return "TodoDomain.Err.Rejected";
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
      } else if (this.\$tag === 5) {
        return other.\$tag === 5;
      } else if (this.\$tag === 6) {
        return other.\$tag === 6;
      } else if (this.\$tag === 7) {
        return other.\$tag === 7;
      } else if (this.\$tag === 8) {
        return other.\$tag === 8;
      } else if (this.\$tag === 9) {
        return other.\$tag === 9;
      } else if (this.\$tag === 10) {
        return other.\$tag === 10;
      } else if (this.\$tag === 11) {
        return other.\$tag === 11;
      } else if (this.\$tag === 12) {
        return other.\$tag === 12;
      } else if (this.\$tag === 13) {
        return other.\$tag === 13;
      } else if (this.\$tag === 14) {
        return other.\$tag === 14;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.Err.create_MissingList();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Err.Default();
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
        return "TodoDomain.Place.AtEnd";
      } else if (this.\$tag === 1) {
        return "TodoDomain.Place.Before" + "(" + _dafny.toString(this.anchor) + ")";
      } else if (this.\$tag === 2) {
        return "TodoDomain.Place.After" + "(" + _dafny.toString(this.anchor) + ")";
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
      return TodoDomain.Place.create_AtEnd();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Place.Default();
        }
      };
    }
  }

  \$module.ListPlace = class ListPlace {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_ListAtEnd() {
      let \$dt = new ListPlace(0);
      return \$dt;
    }
    static create_ListBefore(anchor) {
      let \$dt = new ListPlace(1);
      \$dt.anchor = anchor;
      return \$dt;
    }
    static create_ListAfter(anchor) {
      let \$dt = new ListPlace(2);
      \$dt.anchor = anchor;
      return \$dt;
    }
    get is_ListAtEnd() { return this.\$tag === 0; }
    get is_ListBefore() { return this.\$tag === 1; }
    get is_ListAfter() { return this.\$tag === 2; }
    get dtor_anchor() { return this.anchor; }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.ListPlace.ListAtEnd";
      } else if (this.\$tag === 1) {
        return "TodoDomain.ListPlace.ListBefore" + "(" + _dafny.toString(this.anchor) + ")";
      } else if (this.\$tag === 2) {
        return "TodoDomain.ListPlace.ListAfter" + "(" + _dafny.toString(this.anchor) + ")";
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
      return TodoDomain.ListPlace.create_ListAtEnd();
    }
    static Rtd() {
      return class {
        static get Default() {
          return ListPlace.Default();
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
    static create_AddList(name) {
      let \$dt = new Action(1);
      \$dt.name = name;
      return \$dt;
    }
    static create_RenameList(listId, newName) {
      let \$dt = new Action(2);
      \$dt.listId = listId;
      \$dt.newName = newName;
      return \$dt;
    }
    static create_DeleteList(listId) {
      let \$dt = new Action(3);
      \$dt.listId = listId;
      return \$dt;
    }
    static create_MoveList(listId, listPlace) {
      let \$dt = new Action(4);
      \$dt.listId = listId;
      \$dt.listPlace = listPlace;
      return \$dt;
    }
    static create_AddTask(listId, title) {
      let \$dt = new Action(5);
      \$dt.listId = listId;
      \$dt.title = title;
      return \$dt;
    }
    static create_EditTask(taskId, title, notes) {
      let \$dt = new Action(6);
      \$dt.taskId = taskId;
      \$dt.title = title;
      \$dt.notes = notes;
      return \$dt;
    }
    static create_DeleteTask(taskId, userId) {
      let \$dt = new Action(7);
      \$dt.taskId = taskId;
      \$dt.userId = userId;
      return \$dt;
    }
    static create_RestoreTask(taskId) {
      let \$dt = new Action(8);
      \$dt.taskId = taskId;
      return \$dt;
    }
    static create_MoveTask(taskId, toList, taskPlace) {
      let \$dt = new Action(9);
      \$dt.taskId = taskId;
      \$dt.toList = toList;
      \$dt.taskPlace = taskPlace;
      return \$dt;
    }
    static create_CompleteTask(taskId) {
      let \$dt = new Action(10);
      \$dt.taskId = taskId;
      return \$dt;
    }
    static create_UncompleteTask(taskId) {
      let \$dt = new Action(11);
      \$dt.taskId = taskId;
      return \$dt;
    }
    static create_StarTask(taskId) {
      let \$dt = new Action(12);
      \$dt.taskId = taskId;
      return \$dt;
    }
    static create_UnstarTask(taskId) {
      let \$dt = new Action(13);
      \$dt.taskId = taskId;
      return \$dt;
    }
    static create_SetDueDate(taskId, dueDate) {
      let \$dt = new Action(14);
      \$dt.taskId = taskId;
      \$dt.dueDate = dueDate;
      return \$dt;
    }
    static create_AssignTask(taskId, userId) {
      let \$dt = new Action(15);
      \$dt.taskId = taskId;
      \$dt.userId = userId;
      return \$dt;
    }
    static create_UnassignTask(taskId, userId) {
      let \$dt = new Action(16);
      \$dt.taskId = taskId;
      \$dt.userId = userId;
      return \$dt;
    }
    static create_AddTagToTask(taskId, tagId) {
      let \$dt = new Action(17);
      \$dt.taskId = taskId;
      \$dt.tagId = tagId;
      return \$dt;
    }
    static create_RemoveTagFromTask(taskId, tagId) {
      let \$dt = new Action(18);
      \$dt.taskId = taskId;
      \$dt.tagId = tagId;
      return \$dt;
    }
    static create_CreateTag(name) {
      let \$dt = new Action(19);
      \$dt.name = name;
      return \$dt;
    }
    static create_RenameTag(tagId, newName) {
      let \$dt = new Action(20);
      \$dt.tagId = tagId;
      \$dt.newName = newName;
      return \$dt;
    }
    static create_DeleteTag(tagId) {
      let \$dt = new Action(21);
      \$dt.tagId = tagId;
      return \$dt;
    }
    static create_MakeCollaborative() {
      let \$dt = new Action(22);
      return \$dt;
    }
    static create_AddMember(userId) {
      let \$dt = new Action(23);
      \$dt.userId = userId;
      return \$dt;
    }
    static create_RemoveMember(userId) {
      let \$dt = new Action(24);
      \$dt.userId = userId;
      return \$dt;
    }
    get is_NoOp() { return this.\$tag === 0; }
    get is_AddList() { return this.\$tag === 1; }
    get is_RenameList() { return this.\$tag === 2; }
    get is_DeleteList() { return this.\$tag === 3; }
    get is_MoveList() { return this.\$tag === 4; }
    get is_AddTask() { return this.\$tag === 5; }
    get is_EditTask() { return this.\$tag === 6; }
    get is_DeleteTask() { return this.\$tag === 7; }
    get is_RestoreTask() { return this.\$tag === 8; }
    get is_MoveTask() { return this.\$tag === 9; }
    get is_CompleteTask() { return this.\$tag === 10; }
    get is_UncompleteTask() { return this.\$tag === 11; }
    get is_StarTask() { return this.\$tag === 12; }
    get is_UnstarTask() { return this.\$tag === 13; }
    get is_SetDueDate() { return this.\$tag === 14; }
    get is_AssignTask() { return this.\$tag === 15; }
    get is_UnassignTask() { return this.\$tag === 16; }
    get is_AddTagToTask() { return this.\$tag === 17; }
    get is_RemoveTagFromTask() { return this.\$tag === 18; }
    get is_CreateTag() { return this.\$tag === 19; }
    get is_RenameTag() { return this.\$tag === 20; }
    get is_DeleteTag() { return this.\$tag === 21; }
    get is_MakeCollaborative() { return this.\$tag === 22; }
    get is_AddMember() { return this.\$tag === 23; }
    get is_RemoveMember() { return this.\$tag === 24; }
    get dtor_name() { return this.name; }
    get dtor_listId() { return this.listId; }
    get dtor_newName() { return this.newName; }
    get dtor_listPlace() { return this.listPlace; }
    get dtor_title() { return this.title; }
    get dtor_taskId() { return this.taskId; }
    get dtor_notes() { return this.notes; }
    get dtor_userId() { return this.userId; }
    get dtor_toList() { return this.toList; }
    get dtor_taskPlace() { return this.taskPlace; }
    get dtor_dueDate() { return this.dueDate; }
    get dtor_tagId() { return this.tagId; }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.Action.NoOp";
      } else if (this.\$tag === 1) {
        return "TodoDomain.Action.AddList" + "(" + this.name.toVerbatimString(true) + ")";
      } else if (this.\$tag === 2) {
        return "TodoDomain.Action.RenameList" + "(" + _dafny.toString(this.listId) + ", " + this.newName.toVerbatimString(true) + ")";
      } else if (this.\$tag === 3) {
        return "TodoDomain.Action.DeleteList" + "(" + _dafny.toString(this.listId) + ")";
      } else if (this.\$tag === 4) {
        return "TodoDomain.Action.MoveList" + "(" + _dafny.toString(this.listId) + ", " + _dafny.toString(this.listPlace) + ")";
      } else if (this.\$tag === 5) {
        return "TodoDomain.Action.AddTask" + "(" + _dafny.toString(this.listId) + ", " + this.title.toVerbatimString(true) + ")";
      } else if (this.\$tag === 6) {
        return "TodoDomain.Action.EditTask" + "(" + _dafny.toString(this.taskId) + ", " + this.title.toVerbatimString(true) + ", " + this.notes.toVerbatimString(true) + ")";
      } else if (this.\$tag === 7) {
        return "TodoDomain.Action.DeleteTask" + "(" + _dafny.toString(this.taskId) + ", " + this.userId.toVerbatimString(true) + ")";
      } else if (this.\$tag === 8) {
        return "TodoDomain.Action.RestoreTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.\$tag === 9) {
        return "TodoDomain.Action.MoveTask" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.toList) + ", " + _dafny.toString(this.taskPlace) + ")";
      } else if (this.\$tag === 10) {
        return "TodoDomain.Action.CompleteTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.\$tag === 11) {
        return "TodoDomain.Action.UncompleteTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.\$tag === 12) {
        return "TodoDomain.Action.StarTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.\$tag === 13) {
        return "TodoDomain.Action.UnstarTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.\$tag === 14) {
        return "TodoDomain.Action.SetDueDate" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.dueDate) + ")";
      } else if (this.\$tag === 15) {
        return "TodoDomain.Action.AssignTask" + "(" + _dafny.toString(this.taskId) + ", " + this.userId.toVerbatimString(true) + ")";
      } else if (this.\$tag === 16) {
        return "TodoDomain.Action.UnassignTask" + "(" + _dafny.toString(this.taskId) + ", " + this.userId.toVerbatimString(true) + ")";
      } else if (this.\$tag === 17) {
        return "TodoDomain.Action.AddTagToTask" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.tagId) + ")";
      } else if (this.\$tag === 18) {
        return "TodoDomain.Action.RemoveTagFromTask" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.tagId) + ")";
      } else if (this.\$tag === 19) {
        return "TodoDomain.Action.CreateTag" + "(" + this.name.toVerbatimString(true) + ")";
      } else if (this.\$tag === 20) {
        return "TodoDomain.Action.RenameTag" + "(" + _dafny.toString(this.tagId) + ", " + this.newName.toVerbatimString(true) + ")";
      } else if (this.\$tag === 21) {
        return "TodoDomain.Action.DeleteTag" + "(" + _dafny.toString(this.tagId) + ")";
      } else if (this.\$tag === 22) {
        return "TodoDomain.Action.MakeCollaborative";
      } else if (this.\$tag === 23) {
        return "TodoDomain.Action.AddMember" + "(" + this.userId.toVerbatimString(true) + ")";
      } else if (this.\$tag === 24) {
        return "TodoDomain.Action.RemoveMember" + "(" + this.userId.toVerbatimString(true) + ")";
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
        return other.\$tag === 1 && _dafny.areEqual(this.name, other.name);
      } else if (this.\$tag === 2) {
        return other.\$tag === 2 && _dafny.areEqual(this.listId, other.listId) && _dafny.areEqual(this.newName, other.newName);
      } else if (this.\$tag === 3) {
        return other.\$tag === 3 && _dafny.areEqual(this.listId, other.listId);
      } else if (this.\$tag === 4) {
        return other.\$tag === 4 && _dafny.areEqual(this.listId, other.listId) && _dafny.areEqual(this.listPlace, other.listPlace);
      } else if (this.\$tag === 5) {
        return other.\$tag === 5 && _dafny.areEqual(this.listId, other.listId) && _dafny.areEqual(this.title, other.title);
      } else if (this.\$tag === 6) {
        return other.\$tag === 6 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.title, other.title) && _dafny.areEqual(this.notes, other.notes);
      } else if (this.\$tag === 7) {
        return other.\$tag === 7 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.userId, other.userId);
      } else if (this.\$tag === 8) {
        return other.\$tag === 8 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.\$tag === 9) {
        return other.\$tag === 9 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.toList, other.toList) && _dafny.areEqual(this.taskPlace, other.taskPlace);
      } else if (this.\$tag === 10) {
        return other.\$tag === 10 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.\$tag === 11) {
        return other.\$tag === 11 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.\$tag === 12) {
        return other.\$tag === 12 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.\$tag === 13) {
        return other.\$tag === 13 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.\$tag === 14) {
        return other.\$tag === 14 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.dueDate, other.dueDate);
      } else if (this.\$tag === 15) {
        return other.\$tag === 15 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.userId, other.userId);
      } else if (this.\$tag === 16) {
        return other.\$tag === 16 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.userId, other.userId);
      } else if (this.\$tag === 17) {
        return other.\$tag === 17 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.tagId, other.tagId);
      } else if (this.\$tag === 18) {
        return other.\$tag === 18 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.tagId, other.tagId);
      } else if (this.\$tag === 19) {
        return other.\$tag === 19 && _dafny.areEqual(this.name, other.name);
      } else if (this.\$tag === 20) {
        return other.\$tag === 20 && _dafny.areEqual(this.tagId, other.tagId) && _dafny.areEqual(this.newName, other.newName);
      } else if (this.\$tag === 21) {
        return other.\$tag === 21 && _dafny.areEqual(this.tagId, other.tagId);
      } else if (this.\$tag === 22) {
        return other.\$tag === 22;
      } else if (this.\$tag === 23) {
        return other.\$tag === 23 && _dafny.areEqual(this.userId, other.userId);
      } else if (this.\$tag === 24) {
        return other.\$tag === 24 && _dafny.areEqual(this.userId, other.userId);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.Action.create_NoOp();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Action.Default();
        }
      };
    }
  }

  \$module.ViewMode = class ViewMode {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_SingleProject() {
      let \$dt = new ViewMode(0);
      return \$dt;
    }
    static create_AllProjects() {
      let \$dt = new ViewMode(1);
      return \$dt;
    }
    get is_SingleProject() { return this.\$tag === 0; }
    get is_AllProjects() { return this.\$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield ViewMode.create_SingleProject();
      yield ViewMode.create_AllProjects();
    }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.ViewMode.SingleProject";
      } else if (this.\$tag === 1) {
        return "TodoDomain.ViewMode.AllProjects";
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
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.ViewMode.create_SingleProject();
    }
    static Rtd() {
      return class {
        static get Default() {
          return ViewMode.Default();
        }
      };
    }
  }

  \$module.SmartListType = class SmartListType {
    constructor(tag) {
      this.\$tag = tag;
    }
    static create_Priority() {
      let \$dt = new SmartListType(0);
      return \$dt;
    }
    static create_Logbook() {
      let \$dt = new SmartListType(1);
      return \$dt;
    }
    get is_Priority() { return this.\$tag === 0; }
    get is_Logbook() { return this.\$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield SmartListType.create_Priority();
      yield SmartListType.create_Logbook();
    }
    toString() {
      if (this.\$tag === 0) {
        return "TodoDomain.SmartListType.Priority";
      } else if (this.\$tag === 1) {
        return "TodoDomain.SmartListType.Logbook";
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
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.SmartListType.create_Priority();
    }
    static Rtd() {
      return class {
        static get Default() {
          return SmartListType.Default();
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
        return "TodoDomain.Result.Ok" + "(" + _dafny.toString(this.value) + ")";
      } else if (this.\$tag === 1) {
        return "TodoDomain.Result.Err" + "(" + _dafny.toString(this.error) + ")";
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
      return TodoDomain.Result.create_Ok(_default_T);
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
})(); // end of module TodoDomain
let TodoMultiCollaboration = (function() {
  let \$module = {};

  \$module.__default = class __default {
    constructor () {
      this._tname = "TodoMultiCollaboration._default";
    }
    _parentTraits() {
      return [];
    }
    static Version(s) {
      return new BigNumber(((s).dtor_appliedLog).length);
    };
    static InitServer() {
      return TodoMultiCollaboration.ServerState.create_ServerState(TodoDomain.__default.Init(), _dafny.Seq.of(), _dafny.Seq.of());
    };
    static ChooseCandidate(m, cs) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cs).length)).isEqualTo(_dafny.ZERO)) {
          return TodoDomain.Result.create_Err(TodoDomain.__default.RejectErr());
        } else {
          let _source0 = TodoDomain.__default.TryStep(m, (cs)[_dafny.ZERO]);
          {
            if (_source0.is_Ok) {
              let _0_m2 = (_source0).value;
              return TodoDomain.Result.create_Ok(_dafny.Tuple.of(_0_m2, (cs)[_dafny.ZERO]));
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
      let _1_rebased = TodoDomain.__default.RebaseThroughSuffix(_0_suffix, orig);
      let _2_cs = TodoDomain.__default.Candidates((s).dtor_present, _1_rebased);
      let _source0 = TodoMultiCollaboration.__default.ChooseCandidate((s).dtor_present, _2_cs);
      {
        if (_source0.is_Ok) {
          let _3_pair = (_source0).value;
          let _4_m2 = (_3_pair)[0];
          let _5_chosen = (_3_pair)[1];
          let _6_noChange = _dafny.areEqual(_4_m2, (s).dtor_present);
          let _7_newApplied = _dafny.Seq.Concat((s).dtor_appliedLog, _dafny.Seq.of(_5_chosen));
          let _8_rec = TodoMultiCollaboration.RequestRecord.create_Req(baseVersion, orig, _1_rebased, _5_chosen, TodoMultiCollaboration.RequestOutcome.create_AuditAccepted(_5_chosen, _6_noChange));
          let _9_newAudit = _dafny.Seq.Concat((s).dtor_auditLog, _dafny.Seq.of(_8_rec));
          return _dafny.Tuple.of(TodoMultiCollaboration.ServerState.create_ServerState(_4_m2, _7_newApplied, _9_newAudit), TodoMultiCollaboration.Reply.create_Accepted(new BigNumber((_7_newApplied).length), _4_m2, _5_chosen, _6_noChange));
        }
      }
      {
        let _10_rec = TodoMultiCollaboration.RequestRecord.create_Req(baseVersion, orig, _1_rebased, _1_rebased, TodoMultiCollaboration.RequestOutcome.create_AuditRejected(TodoMultiCollaboration.RejectReason.create_DomainInvalid(), _1_rebased));
        let _11_newAudit = _dafny.Seq.Concat((s).dtor_auditLog, _dafny.Seq.of(_10_rec));
        return _dafny.Tuple.of(TodoMultiCollaboration.ServerState.create_ServerState((s).dtor_present, (s).dtor_appliedLog, _11_newAudit), TodoMultiCollaboration.Reply.create_Rejected(TodoMultiCollaboration.RejectReason.create_DomainInvalid(), _1_rebased));
      }
    };
    static InitClient(version, model) {
      return TodoMultiCollaboration.ClientState.create_ClientState(version, model, _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return TodoMultiCollaboration.ClientState.create_ClientState(TodoMultiCollaboration.__default.Version(server), (server).dtor_present, _dafny.Seq.of());
    };
    static Sync(server) {
      return TodoMultiCollaboration.ClientState.create_ClientState(TodoMultiCollaboration.__default.Version(server), (server).dtor_present, _dafny.Seq.of());
    };
    static ClientLocalDispatch(client, action) {
      let _0_result = TodoDomain.__default.TryStep((client).dtor_present, action);
      let _source0 = _0_result;
      {
        if (_source0.is_Ok) {
          let _1_newModel = (_source0).value;
          return TodoMultiCollaboration.ClientState.create_ClientState((client).dtor_baseVersion, _1_newModel, _dafny.Seq.Concat((client).dtor_pending, _dafny.Seq.of(action)));
        }
      }
      {
        return TodoMultiCollaboration.ClientState.create_ClientState((client).dtor_baseVersion, (client).dtor_present, _dafny.Seq.Concat((client).dtor_pending, _dafny.Seq.of(action)));
      }
    };
    static ReapplyPending(model, pending) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((pending).length)).isEqualTo(_dafny.ZERO)) {
          return model;
        } else {
          let _0_result = TodoDomain.__default.TryStep(model, (pending)[_dafny.ZERO]);
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
        let _0_newPresent = TodoMultiCollaboration.__default.ReapplyPending(serverModel, (client).dtor_pending);
        return TodoMultiCollaboration.ClientState.create_ClientState(serverVersion, _0_newPresent, (client).dtor_pending);
      } else {
        return client;
      }
    };
    static ClientAcceptReply(client, newVersion, newPresent) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return TodoMultiCollaboration.ClientState.create_ClientState(newVersion, newPresent, _dafny.Seq.of());
      } else {
        let _0_rest = ((client).dtor_pending).slice(_dafny.ONE);
        let _1_reappliedPresent = TodoMultiCollaboration.__default.ReapplyPending(newPresent, _0_rest);
        return TodoMultiCollaboration.ClientState.create_ClientState(newVersion, _1_reappliedPresent, _0_rest);
      }
    };
    static ClientRejectReply(client, freshVersion, freshModel) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return TodoMultiCollaboration.ClientState.create_ClientState(freshVersion, freshModel, _dafny.Seq.of());
      } else {
        let _0_rest = ((client).dtor_pending).slice(_dafny.ONE);
        let _1_reappliedPresent = TodoMultiCollaboration.__default.ReapplyPending(freshModel, _0_rest);
        return TodoMultiCollaboration.ClientState.create_ClientState(freshVersion, _1_reappliedPresent, _0_rest);
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
        return "TodoMultiCollaboration.RejectReason.DomainInvalid";
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
      return TodoMultiCollaboration.RejectReason.create_DomainInvalid();
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
        return "TodoMultiCollaboration.Reply.Accepted" + "(" + _dafny.toString(this.newVersion) + ", " + _dafny.toString(this.newPresent) + ", " + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.\$tag === 1) {
        return "TodoMultiCollaboration.Reply.Rejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
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
      return TodoMultiCollaboration.Reply.create_Accepted(_dafny.ZERO, TodoDomain.Model.Default(), TodoDomain.Action.Default(), false);
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
        return "TodoMultiCollaboration.RequestOutcome.AuditAccepted" + "(" + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.\$tag === 1) {
        return "TodoMultiCollaboration.RequestOutcome.AuditRejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
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
      return TodoMultiCollaboration.RequestOutcome.create_AuditAccepted(TodoDomain.Action.Default(), false);
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
        return "TodoMultiCollaboration.RequestRecord.Req" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.orig) + ", " + _dafny.toString(this.rebased) + ", " + _dafny.toString(this.chosen) + ", " + _dafny.toString(this.outcome) + ")";
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
      return TodoMultiCollaboration.RequestRecord.create_Req(_dafny.ZERO, TodoDomain.Action.Default(), TodoDomain.Action.Default(), TodoDomain.Action.Default(), TodoMultiCollaboration.RequestOutcome.Default());
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
        return "TodoMultiCollaboration.ServerState.ServerState" + "(" + _dafny.toString(this.present) + ", " + _dafny.toString(this.appliedLog) + ", " + _dafny.toString(this.auditLog) + ")";
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
      return TodoMultiCollaboration.ServerState.create_ServerState(TodoDomain.Model.Default(), _dafny.Seq.of(), _dafny.Seq.of());
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
        return "TodoMultiCollaboration.ClientState.ClientState" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.pending) + ")";
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
      return TodoMultiCollaboration.ClientState.create_ClientState(_dafny.ZERO, TodoDomain.Model.Default(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return ClientState.Default();
        }
      };
    }
  }
  return \$module;
})(); // end of module TodoMultiCollaboration
let TodoAppCore = (function() {
  let \$module = {};

  \$module.__default = class __default {
    constructor () {
      this._tname = "TodoAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static InitServerWithOwner(mode, ownerId) {
      let _0_initModel = TodoDomain.Model.create_Model(mode, ownerId, _dafny.Set.fromElements(ownerId), _dafny.Seq.of(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
      return TodoMultiCollaboration.ServerState.create_ServerState(_0_initModel, _dafny.Seq.of(), _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return TodoMultiCollaboration.__default.InitClientFromServer(server);
    };
    static ClientLocalDispatch(client, action) {
      return TodoMultiCollaboration.__default.ClientLocalDispatch(client, action);
    };
    static ServerVersion(server) {
      return TodoMultiCollaboration.__default.Version(server);
    };
    static ServerModel(server) {
      return (server).dtor_present;
    };
    static ClientModel(client) {
      return TodoMultiCollaboration.__default.ClientModel(client);
    };
    static ClientVersion(client) {
      return TodoMultiCollaboration.__default.ClientVersion(client);
    };
    static PendingCount(client) {
      return TodoMultiCollaboration.__default.PendingCount(client);
    };
    static InitClient(version, model) {
      return TodoMultiCollaboration.__default.InitClient(version, model);
    };
    static HandleRealtimeUpdate(client, serverVersion, serverModel) {
      return TodoMultiCollaboration.__default.HandleRealtimeUpdate(client, serverVersion, serverModel);
    };
  };
  return \$module;
})(); // end of module TodoAppCore
let _module = (function() {
  let \$module = {};

  return \$module;
})(); // end of module _module

  return { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore };
`);

const { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore } = initDafny(require, exports, module);

export { _dafny, TodoDomain, TodoMultiCollaboration, TodoAppCore, BigNumber };

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

// deno-lint-ignore no-explicit-any
const setToArray = (set: any): any[] => {
  if (!set || !set.Elements) return [];
  return Array.from(set.Elements);
};

// ============================================================================
// Option helpers
// ============================================================================

// deno-lint-ignore no-explicit-any
const optionToJs = (opt: any, converter: (x: any) => any = (x) => x): any => {
  if (opt.is_None) return null;
  return converter(opt.dtor_value);
};

// deno-lint-ignore no-explicit-any
const jsToOption = (val: any, converter: (x: any) => any = (x) => x): any => {
  if (val === null || val === undefined) {
    return TodoDomain.Option.create_None();
  }
  return TodoDomain.Option.create_Some(converter(val));
};

// ============================================================================
// Date conversion
// ============================================================================

interface DateJson {
  year: number;
  month: number;
  day: number;
}

// deno-lint-ignore no-explicit-any
const dateToJs = (date: any): DateJson => {
  return {
    year: toNumber(date.dtor_year),
    month: toNumber(date.dtor_month),
    day: toNumber(date.dtor_day)
  };
};

const jsToDate = (obj: DateJson): any => {
  return TodoDomain.Date.create_Date(
    new BigNumber(obj.year),
    new BigNumber(obj.month),
    new BigNumber(obj.day)
  );
};

// ============================================================================
// Task conversion
// ============================================================================

interface TaskJson {
  title: string;
  notes: string;
  completed: boolean;
  starred: boolean;
  dueDate: DateJson | null;
  assignees: string[];
  tags: number[];
  deleted: boolean;
  deletedBy: string | null;
  deletedFromList: number | null;
}

// deno-lint-ignore no-explicit-any
const taskToJs = (task: any): TaskJson => {
  return {
    title: dafnyStringToJs(task.dtor_title),
    notes: dafnyStringToJs(task.dtor_notes),
    completed: task.dtor_completed,
    starred: task.dtor_starred,
    dueDate: optionToJs(task.dtor_dueDate, dateToJs),
    assignees: setToArray(task.dtor_assignees).map(dafnyStringToJs),
    tags: setToArray(task.dtor_tags).map(toNumber),
    deleted: task.dtor_deleted,
    deletedBy: optionToJs(task.dtor_deletedBy, dafnyStringToJs),
    deletedFromList: optionToJs(task.dtor_deletedFromList, toNumber)
  };
};

// ============================================================================
// Model conversion
// ============================================================================

interface Model {
  mode: 'Personal' | 'Collaborative';
  owner: string;
  members: string[];
  lists: number[];
  listNames: Record<number, string>;
  tasks: Record<number, number[]>;
  taskData: Record<number, TaskJson>;
  tags: Record<number, { name: string }>;
  nextListId: number;
  nextTaskId: number;
  nextTagId: number;
}

// deno-lint-ignore no-explicit-any
export const modelFromJson = (json: Model): any => {
  // Mode
  const mode = json.mode === 'Collaborative'
    ? TodoDomain.ProjectMode.create_Collaborative()
    : TodoDomain.ProjectMode.create_Personal();

  // Owner and members
  const owner = _dafny.Seq.UnicodeFromString(json.owner || '');
  let members = _dafny.Set.Empty;
  for (const m of (json.members || [])) {
    members = members.Union(_dafny.Set.fromElements(_dafny.Seq.UnicodeFromString(m)));
  }

  // Lists
  const lists = _dafny.Seq.of(...(json.lists || []).map((id: number) => new BigNumber(id)));

  // ListNames
  let listNames = _dafny.Map.Empty;
  for (const [id, name] of Object.entries(json.listNames || {})) {
    listNames = listNames.update(new BigNumber(id), _dafny.Seq.UnicodeFromString(name));
  }

  // Tasks (listId -> seq<taskId>)
  let tasks = _dafny.Map.Empty;
  for (const [listId, taskIds] of Object.entries(json.tasks || {})) {
    const key = new BigNumber(listId);
    const value = _dafny.Seq.of(...(taskIds as number[]).map((id: number) => new BigNumber(id)));
    tasks = tasks.update(key, value);
  }

  // TaskData
  let taskData = _dafny.Map.Empty;
  for (const [taskId, task] of Object.entries(json.taskData || {})) {
    const key = new BigNumber(taskId);
    const t = task as TaskJson;

    // Convert assignees to Dafny set of strings
    let assignees = _dafny.Set.Empty;
    for (const a of (t.assignees || [])) {
      assignees = assignees.Union(_dafny.Set.fromElements(_dafny.Seq.UnicodeFromString(a)));
    }

    // Convert tags to Dafny set of nats
    let tags = _dafny.Set.Empty;
    for (const tagId of (t.tags || [])) {
      tags = tags.Union(_dafny.Set.fromElements(new BigNumber(tagId)));
    }

    // Convert dueDate
    const dueDate = t.dueDate
      ? TodoDomain.Option.create_Some(jsToDate(t.dueDate))
      : TodoDomain.Option.create_None();

    // Convert deletedBy
    const deletedBy = t.deletedBy
      ? TodoDomain.Option.create_Some(_dafny.Seq.UnicodeFromString(t.deletedBy))
      : TodoDomain.Option.create_None();

    // Convert deletedFromList
    const deletedFromList = t.deletedFromList !== null && t.deletedFromList !== undefined
      ? TodoDomain.Option.create_Some(new BigNumber(t.deletedFromList))
      : TodoDomain.Option.create_None();

    const value = TodoDomain.Task.create_Task(
      _dafny.Seq.UnicodeFromString(t.title || ''),
      _dafny.Seq.UnicodeFromString(t.notes || ''),
      t.completed || false,
      t.starred || false,
      dueDate,
      assignees,
      tags,
      t.deleted || false,
      deletedBy,
      deletedFromList
    );
    taskData = taskData.update(key, value);
  }

  // Tags
  let tagsMap = _dafny.Map.Empty;
  for (const [tagId, tag] of Object.entries(json.tags || {})) {
    const key = new BigNumber(tagId);
    const value = TodoDomain.Tag.create_Tag(_dafny.Seq.UnicodeFromString((tag as { name: string }).name || ''));
    tagsMap = tagsMap.update(key, value);
  }

  return TodoDomain.Model.create_Model(
    mode,
    owner,
    members,
    lists,
    listNames,
    tasks,
    taskData,
    tagsMap,
    new BigNumber(json.nextListId || 0),
    new BigNumber(json.nextTaskId || 0),
    new BigNumber(json.nextTagId || 0)
  );
};

// deno-lint-ignore no-explicit-any
export const modelToJson = (m: any): Model => {
  const mode = m.dtor_mode.is_Collaborative ? 'Collaborative' : 'Personal';
  const owner = dafnyStringToJs(m.dtor_owner);
  const members = setToArray(m.dtor_members).map(dafnyStringToJs);
  const lists = seqToArray(m.dtor_lists).map(toNumber);

  const listNames: Record<number, string> = {};
  if (m.dtor_listNames && m.dtor_listNames.Keys) {
    for (const key of m.dtor_listNames.Keys.Elements) {
      listNames[toNumber(key)] = dafnyStringToJs(m.dtor_listNames.get(key));
    }
  }

  const tasks: Record<number, number[]> = {};
  if (m.dtor_tasks && m.dtor_tasks.Keys) {
    for (const key of m.dtor_tasks.Keys.Elements) {
      tasks[toNumber(key)] = seqToArray(m.dtor_tasks.get(key)).map(toNumber);
    }
  }

  const taskData: Record<number, TaskJson> = {};
  if (m.dtor_taskData && m.dtor_taskData.Keys) {
    for (const key of m.dtor_taskData.Keys.Elements) {
      taskData[toNumber(key)] = taskToJs(m.dtor_taskData.get(key));
    }
  }

  const tags: Record<number, { name: string }> = {};
  if (m.dtor_tags && m.dtor_tags.Keys) {
    for (const key of m.dtor_tags.Keys.Elements) {
      tags[toNumber(key)] = { name: dafnyStringToJs(m.dtor_tags.get(key).dtor_name) };
    }
  }

  return {
    mode: mode as 'Personal' | 'Collaborative',
    owner,
    members,
    lists,
    listNames,
    tasks,
    taskData,
    tags,
    nextListId: toNumber(m.dtor_nextListId),
    nextTaskId: toNumber(m.dtor_nextTaskId),
    nextTagId: toNumber(m.dtor_nextTagId)
  };
};

// ============================================================================
// Place conversion
// ============================================================================

interface Place {
  type: 'AtEnd' | 'Before' | 'After';
  anchor?: number;
}

interface ListPlace {
  type: 'ListAtEnd' | 'ListBefore' | 'ListAfter';
  anchor?: number;
}

const placeFromJson = (json: Place | undefined): any => {
  if (!json || json.type === 'AtEnd') {
    return TodoDomain.Place.create_AtEnd();
  } else if (json.type === 'Before') {
    return TodoDomain.Place.create_Before(new BigNumber(json.anchor!));
  } else if (json.type === 'After') {
    return TodoDomain.Place.create_After(new BigNumber(json.anchor!));
  }
  return TodoDomain.Place.create_AtEnd();
};

// deno-lint-ignore no-explicit-any
const placeToJson = (place: any): Place => {
  if (place.is_AtEnd) return { type: 'AtEnd' };
  if (place.is_Before) return { type: 'Before', anchor: toNumber(place.dtor_anchor) };
  if (place.is_After) return { type: 'After', anchor: toNumber(place.dtor_anchor) };
  return { type: 'AtEnd' };
};

const listPlaceFromJson = (json: ListPlace | undefined): any => {
  if (!json || json.type === 'ListAtEnd') {
    return TodoDomain.ListPlace.create_ListAtEnd();
  } else if (json.type === 'ListBefore') {
    return TodoDomain.ListPlace.create_ListBefore(new BigNumber(json.anchor!));
  } else if (json.type === 'ListAfter') {
    return TodoDomain.ListPlace.create_ListAfter(new BigNumber(json.anchor!));
  }
  return TodoDomain.ListPlace.create_ListAtEnd();
};

// deno-lint-ignore no-explicit-any
const listPlaceToJson = (place: any): ListPlace => {
  if (place.is_ListAtEnd) return { type: 'ListAtEnd' };
  if (place.is_ListBefore) return { type: 'ListBefore', anchor: toNumber(place.dtor_anchor) };
  if (place.is_ListAfter) return { type: 'ListAfter', anchor: toNumber(place.dtor_anchor) };
  return { type: 'ListAtEnd' };
};

// ============================================================================
// Action conversion
// ============================================================================

interface Action {
  type: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

// deno-lint-ignore no-explicit-any
export const actionFromJson = (json: Action): any => {
  switch (json.type) {
    case 'NoOp':
      return TodoDomain.Action.create_NoOp();

    // List operations
    case 'AddList':
      return TodoDomain.Action.create_AddList(_dafny.Seq.UnicodeFromString(json.name));
    case 'RenameList':
      return TodoDomain.Action.create_RenameList(
        new BigNumber(json.listId),
        _dafny.Seq.UnicodeFromString(json.newName)
      );
    case 'DeleteList':
      return TodoDomain.Action.create_DeleteList(new BigNumber(json.listId));
    case 'MoveList':
      return TodoDomain.Action.create_MoveList(
        new BigNumber(json.listId),
        listPlaceFromJson(json.listPlace)
      );

    // Task CRUD
    case 'AddTask':
      return TodoDomain.Action.create_AddTask(
        new BigNumber(json.listId),
        _dafny.Seq.UnicodeFromString(json.title)
      );
    case 'EditTask':
      return TodoDomain.Action.create_EditTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.title),
        _dafny.Seq.UnicodeFromString(json.notes || '')
      );
    case 'DeleteTask':
      return TodoDomain.Action.create_DeleteTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.userId)
      );
    case 'RestoreTask':
      return TodoDomain.Action.create_RestoreTask(new BigNumber(json.taskId));
    case 'MoveTask':
      return TodoDomain.Action.create_MoveTask(
        new BigNumber(json.taskId),
        new BigNumber(json.toList),
        placeFromJson(json.taskPlace)
      );

    // Task status
    case 'CompleteTask':
      return TodoDomain.Action.create_CompleteTask(new BigNumber(json.taskId));
    case 'UncompleteTask':
      return TodoDomain.Action.create_UncompleteTask(new BigNumber(json.taskId));
    case 'StarTask':
      return TodoDomain.Action.create_StarTask(new BigNumber(json.taskId));
    case 'UnstarTask':
      return TodoDomain.Action.create_UnstarTask(new BigNumber(json.taskId));

    // Due date
    case 'SetDueDate':
      return TodoDomain.Action.create_SetDueDate(
        new BigNumber(json.taskId),
        jsToOption(json.dueDate, jsToDate)
      );

    // Assignment
    case 'AssignTask':
      return TodoDomain.Action.create_AssignTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.userId)
      );
    case 'UnassignTask':
      return TodoDomain.Action.create_UnassignTask(
        new BigNumber(json.taskId),
        _dafny.Seq.UnicodeFromString(json.userId)
      );

    // Tags on tasks
    case 'AddTagToTask':
      return TodoDomain.Action.create_AddTagToTask(
        new BigNumber(json.taskId),
        new BigNumber(json.tagId)
      );
    case 'RemoveTagFromTask':
      return TodoDomain.Action.create_RemoveTagFromTask(
        new BigNumber(json.taskId),
        new BigNumber(json.tagId)
      );

    // Tag CRUD
    case 'CreateTag':
      return TodoDomain.Action.create_CreateTag(_dafny.Seq.UnicodeFromString(json.name));
    case 'RenameTag':
      return TodoDomain.Action.create_RenameTag(
        new BigNumber(json.tagId),
        _dafny.Seq.UnicodeFromString(json.newName)
      );
    case 'DeleteTag':
      return TodoDomain.Action.create_DeleteTag(new BigNumber(json.tagId));

    // Project mode
    case 'MakeCollaborative':
      return TodoDomain.Action.create_MakeCollaborative();

    // Membership
    case 'AddMember':
      return TodoDomain.Action.create_AddMember(_dafny.Seq.UnicodeFromString(json.userId));
    case 'RemoveMember':
      return TodoDomain.Action.create_RemoveMember(_dafny.Seq.UnicodeFromString(json.userId));

    default:
      return TodoDomain.Action.create_NoOp();
  }
};

// deno-lint-ignore no-explicit-any
export const actionToJson = (action: any): Action => {
  if (action.is_NoOp) return { type: 'NoOp' };

  // List operations
  if (action.is_AddList) return { type: 'AddList', name: dafnyStringToJs(action.dtor_name) };
  if (action.is_RenameList) return {
    type: 'RenameList',
    listId: toNumber(action.dtor_listId),
    newName: dafnyStringToJs(action.dtor_newName)
  };
  if (action.is_DeleteList) return { type: 'DeleteList', listId: toNumber(action.dtor_listId) };
  if (action.is_MoveList) return {
    type: 'MoveList',
    listId: toNumber(action.dtor_listId),
    listPlace: listPlaceToJson(action.dtor_listPlace)
  };

  // Task CRUD
  if (action.is_AddTask) return {
    type: 'AddTask',
    listId: toNumber(action.dtor_listId),
    title: dafnyStringToJs(action.dtor_title)
  };
  if (action.is_EditTask) return {
    type: 'EditTask',
    taskId: toNumber(action.dtor_taskId),
    title: dafnyStringToJs(action.dtor_title),
    notes: dafnyStringToJs(action.dtor_notes)
  };
  if (action.is_DeleteTask) return {
    type: 'DeleteTask',
    taskId: toNumber(action.dtor_taskId),
    userId: dafnyStringToJs(action.dtor_userId)
  };
  if (action.is_RestoreTask) return { type: 'RestoreTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_MoveTask) return {
    type: 'MoveTask',
    taskId: toNumber(action.dtor_taskId),
    toList: toNumber(action.dtor_toList),
    taskPlace: placeToJson(action.dtor_taskPlace)
  };

  // Task status
  if (action.is_CompleteTask) return { type: 'CompleteTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_UncompleteTask) return { type: 'UncompleteTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_StarTask) return { type: 'StarTask', taskId: toNumber(action.dtor_taskId) };
  if (action.is_UnstarTask) return { type: 'UnstarTask', taskId: toNumber(action.dtor_taskId) };

  // Due date
  if (action.is_SetDueDate) return {
    type: 'SetDueDate',
    taskId: toNumber(action.dtor_taskId),
    dueDate: optionToJs(action.dtor_dueDate, dateToJs)
  };

  // Assignment
  if (action.is_AssignTask) return {
    type: 'AssignTask',
    taskId: toNumber(action.dtor_taskId),
    userId: dafnyStringToJs(action.dtor_userId)
  };
  if (action.is_UnassignTask) return {
    type: 'UnassignTask',
    taskId: toNumber(action.dtor_taskId),
    userId: dafnyStringToJs(action.dtor_userId)
  };

  // Tags on tasks
  if (action.is_AddTagToTask) return {
    type: 'AddTagToTask',
    taskId: toNumber(action.dtor_taskId),
    tagId: toNumber(action.dtor_tagId)
  };
  if (action.is_RemoveTagFromTask) return {
    type: 'RemoveTagFromTask',
    taskId: toNumber(action.dtor_taskId),
    tagId: toNumber(action.dtor_tagId)
  };

  // Tag CRUD
  if (action.is_CreateTag) return { type: 'CreateTag', name: dafnyStringToJs(action.dtor_name) };
  if (action.is_RenameTag) return {
    type: 'RenameTag',
    tagId: toNumber(action.dtor_tagId),
    newName: dafnyStringToJs(action.dtor_newName)
  };
  if (action.is_DeleteTag) return { type: 'DeleteTag', tagId: toNumber(action.dtor_tagId) };

  // Project mode
  if (action.is_MakeCollaborative) return { type: 'MakeCollaborative' };

  // Membership
  if (action.is_AddMember) return { type: 'AddMember', userId: dafnyStringToJs(action.dtor_userId) };
  if (action.is_RemoveMember) return { type: 'RemoveMember', userId: dafnyStringToJs(action.dtor_userId) };

  return { type: 'NoOp' };
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
      ? TodoMultiCollaboration.RequestOutcome.create_AuditAccepted(
          actionFromJson(rec.outcome.applied!),
          rec.outcome.noChange || false
        )
      : TodoMultiCollaboration.RequestOutcome.create_AuditRejected(
          TodoMultiCollaboration.RejectReason.create_DomainInvalid(),
          actionFromJson(rec.outcome.applied || rec.rebased)
        );

    return TodoMultiCollaboration.RequestRecord.create_Req(
      new BigNumber(rec.baseVersion),
      actionFromJson(rec.orig),
      actionFromJson(rec.rebased),
      actionFromJson(rec.chosen),
      outcome
    );
  });
  const auditLog = _dafny.Seq.of(...auditRecords);

  return TodoMultiCollaboration.ServerState.create_ServerState(
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
  // deno-lint-ignore no-explicit-any
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
// Verified Dispatch (uses TodoMultiCollaboration.Dispatch directly)
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
 * This uses the Dafny-verified Dispatch function, which handles:
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
  const result = TodoMultiCollaboration.__default.Dispatch(
    serverState,
    new BigNumber(baseVersion),
    action
  );

  // Result is a tuple: [newServerState, reply]
  const newServerState = result[0];
  const reply = result[1];

  // Extract new state
  const newStateJson = serverStateToJson(newServerState);

  // Check reply type using Dafny datatype discriminator property
  if (reply.is_Accepted) {
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
