// Dafny program Canon.dfy compiled into JavaScript
// Copyright by the contributors to the Dafny Project
// SPDX-License-Identifier: MIT

const BigNumber = require('bignumber.js');
BigNumber.config({ MODULO_MODE: BigNumber.EUCLID })
let _dafny = (function() {
  let $module = {};
  $module.areEqual = function(a, b) {
    if (typeof a === 'string' && b instanceof _dafny.Seq) {
      // Seq.equals(string) works as expected,
      // and the catch-all else block handles that direction.
      // But the opposite direction doesn't work; handle it here.
      return b.equals(a);
    } else if (typeof a === 'number' && BigNumber.isBigNumber(b)) {
      // This conditional would be correct even without the `typeof a` part,
      // but in most cases it's probably faster to short-circuit on a `typeof`
      // than to call `isBigNumber`. (But it remains to properly test this.)
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
  $module.toString = function(a) {
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
  $module.escapeCharacter = function(cp) {
    let s = String.fromCodePoint(cp.value)
    switch (s) {
      case '\n': return "\\n";
      case '\r': return "\\r";
      case '\t': return "\\t";
      case '\0': return "\\0";
      case '\'': return "\\'";
      case '\"': return "\\\"";
      case '\\': return "\\\\";
      default: return s;
    };
  }
  $module.NewObject = function() {
    return { _tname: "object" };
  }
  $module.InstanceOfTrait = function(obj, trait) {
    return obj._parentTraits !== undefined && obj._parentTraits().includes(trait);
  }
  $module.Rtd_bool = class {
    static get Default() { return false; }
  }
  $module.Rtd_char = class {
    static get Default() { return 'D'; }  // See CharType.DefaultValue in Dafny source code
  }
  $module.Rtd_codepoint = class {
    static get Default() { return new _dafny.CodePoint('D'.codePointAt(0)); }
  }
  $module.Rtd_int = class {
    static get Default() { return BigNumber(0); }
  }
  $module.Rtd_number = class {
    static get Default() { return 0; }
  }
  $module.Rtd_ref = class {
    static get Default() { return null; }
  }
  $module.Rtd_array = class {
    static get Default() { return []; }
  }
  $module.ZERO = new BigNumber(0);
  $module.ONE = new BigNumber(1);
  $module.NUMBER_LIMIT = new BigNumber(0x20).multipliedBy(0x1000000000000);  // 2^53
  $module.Tuple = class Tuple extends Array {
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
  $module.Set = class Set extends Array {
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
  $module.MultiSet = class MultiSet extends Array {
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
  $module.CodePoint = class CodePoint {
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
      return "'" + $module.escapeCharacter(this) + "'";
    }
    static isCodePoint(i) {
      return (
        (_dafny.ZERO.isLessThanOrEqualTo(i) && i.isLessThan(new BigNumber(0xD800))) ||
        (new BigNumber(0xE000).isLessThanOrEqualTo(i) && i.isLessThan(new BigNumber(0x11_0000))))
    }
  }
  $module.Seq = class Seq extends Array {
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
  $module.Map = class Map extends Array {
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
  $module.newArray = function(initValue, ...dims) {
    return { dims: dims, elmts: buildArray(initValue, ...dims) };
  }
  $module.BigOrdinal = class BigOrdinal {
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
  $module.BigRational = class BigRational {
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
    // We need to deal with the special case `num == 0 && den == 0`, because
    // that's what C#'s default struct constructor will produce for BigRational. :(
    // To deal with it, we ignore `den` when `num` is 0.
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
  $module.EuclideanDivisionNumber = function(a, b) {
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
  $module.EuclideanDivision = function(a, b) {
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
  $module.EuclideanModuloNumber = function(a, b) {
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
  $module.ShiftLeft = function(b, n) {
    return b.multipliedBy(new BigNumber(2).exponentiatedBy(n));
  }
  $module.ShiftRight = function(b, n) {
    return b.dividedToIntegerBy(new BigNumber(2).exponentiatedBy(n));
  }
  $module.RotateLeft = function(b, n, w) {  // truncate(b << n) | (b >> (w - n))
    let x = _dafny.ShiftLeft(b, n).mod(new BigNumber(2).exponentiatedBy(w));
    let y = _dafny.ShiftRight(b, w - n);
    return x.plus(y);
  }
  $module.RotateRight = function(b, n, w) {  // (b >> n) | truncate(b << (w - n))
    let x = _dafny.ShiftRight(b, n);
    let y = _dafny.ShiftLeft(b, w - n).mod(new BigNumber(2).exponentiatedBy(w));;
    return x.plus(y);
  }
  $module.BitwiseAnd = function(a, b) {
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
  $module.BitwiseOr = function(a, b) {
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
  $module.BitwiseXor = function(a, b) {
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
  $module.BitwiseNot = function(a, bits) {
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
  $module.Quantifier = function(vals, frall, pred) {
    for (let u of vals) {
      if (pred(u) !== frall) { return !frall; }
    }
    return frall;
  }
  $module.PlusChar = function(a, b) {
    return String.fromCharCode(a.charCodeAt(0) + b.charCodeAt(0));
  }
  $module.UnicodePlusChar = function(a, b) {
    return new _dafny.CodePoint(a.value + b.value);
  }
  $module.MinusChar = function(a, b) {
    return String.fromCharCode(a.charCodeAt(0) - b.charCodeAt(0));
  }
  $module.UnicodeMinusChar = function(a, b) {
    return new _dafny.CodePoint(a.value - b.value);
  }
  $module.AllBooleans = function*() {
    yield false;
    yield true;
  }
  $module.AllChars = function*() {
    for (let i = 0; i < 0x10000; i++) {
      yield String.fromCharCode(i);
    }
  }
  $module.AllUnicodeChars = function*() {
    for (let i = 0; i < 0xD800; i++) {
      yield new _dafny.CodePoint(i);
    }
    for (let i = 0xE0000; i < 0x110000; i++) {
      yield new _dafny.CodePoint(i);
    }
  }
  $module.AllIntegers = function*() {
    yield _dafny.ZERO;
    for (let j = _dafny.ONE;; j = j.plus(1)) {
      yield j;
      yield j.negated();
    }
  }
  $module.IntegerRange = function*(lo, hi) {
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
  $module.SingleValue = function*(v) {
    yield v;
  }
  $module.HaltException = class HaltException extends Error {
    constructor(message) {
      super(message)
    }
  }
  $module.HandleHaltExceptions = function(f) {
    try {
      f()
    } catch (e) {
      if (e instanceof _dafny.HaltException) {
        process.stdout.write("[Program halted] " + e.message + "\n")
        process.exitCode = 1
      } else {
        throw e
      }
    }
  }
  $module.FromMainArguments = function(args) {
    var a = [...args];
    a.splice(0, 2, args[0] + " " + args[1]);
    return a;
  }
  $module.UnicodeFromMainArguments = function(args) {
    return $module.FromMainArguments(args).map(_dafny.Seq.UnicodeFromString);
  }
  return $module;

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
    // like `a.join(", ")`, but calling _dafny.toString(x) on every element x instead of x.toString()
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
  let $module = {};

  $module.nat = class nat {
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

  return $module;
})(); // end of module _System
let Canon = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "Canon._default";
    }
    _parentTraits() {
      return [];
    }
    static AllIn(xs, nodes) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((xs).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((xs).length)))) || ((nodes).contains((xs)[_0_i]));
      });
    };
    static ConstraintTargetsValid(c, nodes) {
      let _source0 = c;
      {
        if (_source0.is_Align) {
          let _0_targets = (_source0).targets;
          return Canon.__default.AllIn(_0_targets, nodes);
        }
      }
      {
        let _1_targets = (_source0).targets;
        return Canon.__default.AllIn(_1_targets, nodes);
      }
    };
    static AllConstraintsValid(cs, nodes) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((cs).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((cs).length)))) || (Canon.__default.ConstraintTargetsValid((cs)[_0_i], nodes));
      });
    };
    static Contains(xs, x) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((xs).length)), false, function (_exists_var_0) {
        let _0_i = _exists_var_0;
        return (((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((xs).length)))) && (_dafny.areEqual((xs)[_0_i], x));
      });
    };
    static Mentions(c, x) {
      let _source0 = c;
      {
        if (_source0.is_Align) {
          let _0_targets = (_source0).targets;
          return Canon.__default.Contains(_0_targets, x);
        }
      }
      {
        let _1_targets = (_source0).targets;
        return Canon.__default.Contains(_1_targets, x);
      }
    };
    static NoneMatch(cs, x) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((cs).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((cs).length)))) || (!(Canon.__default.Mentions((cs)[_0_i], x)));
      });
    };
    static Coord(n, axis) {
      if (_dafny.areEqual(axis, Canon.Axis.create_X())) {
        return (n).dtor_x;
      } else {
        return (n).dtor_y;
      }
    };
    static SetCoord(n, axis, v) {
      if (_dafny.areEqual(axis, Canon.Axis.create_X())) {
        return Canon.Node.create_Node((n).dtor_id, v, (n).dtor_y);
      } else {
        return Canon.Node.create_Node((n).dtor_id, (n).dtor_x, v);
      }
    };
    static Empty() {
      return Canon.Model.create_Model(_dafny.Map.Empty.slice(), _dafny.Seq.of(), _dafny.ZERO);
    };
    static Init(ns) {
      return Canon.Model.create_Model(Canon.__default.NodesFromSeq(ns), _dafny.Seq.of(), _dafny.ZERO);
    };
    static AddAlign(m, sel) {
      let _0_targets = Canon.__default.FilterPresent((m).dtor_nodes, Canon.__default.Dedup(sel));
      if ((new BigNumber((_0_targets).length)).isLessThanOrEqualTo(_dafny.ONE)) {
        return m;
      } else {
        let _1_axis = Canon.__default.InferAxis(m, _0_targets);
        let _2_c = Canon.Constraint.create_Align((m).dtor_nextCid, _0_targets, _1_axis);
        return Canon.Model.create_Model((m).dtor_nodes, _dafny.Seq.Concat((m).dtor_constraints, _dafny.Seq.of(_2_c)), ((m).dtor_nextCid).plus(_dafny.ONE));
      }
    };
    static AddEvenSpace(m, sel) {
      let _0_targets = Canon.__default.FilterPresent((m).dtor_nodes, Canon.__default.Dedup(sel));
      if ((new BigNumber((_0_targets).length)).isLessThanOrEqualTo(new BigNumber(2))) {
        return m;
      } else {
        let _1_axis = Canon.__default.InferAxis(m, _0_targets);
        let _2_c = Canon.Constraint.create_EvenSpace((m).dtor_nextCid, _0_targets, _1_axis);
        return Canon.Model.create_Model((m).dtor_nodes, _dafny.Seq.Concat((m).dtor_constraints, _dafny.Seq.of(_2_c)), ((m).dtor_nextCid).plus(_dafny.ONE));
      }
    };
    static DeleteConstraint(m, cid) {
      return Canon.Model.create_Model((m).dtor_nodes, Canon.__default.FilterOutCid((m).dtor_constraints, cid, (m).dtor_nodes), (m).dtor_nextCid);
    };
    static RemoveNode(m, x) {
      if (!((m).dtor_nodes).contains(x)) {
        return m;
      } else {
        let _0_cs2 = Canon.__default.ShrinkConstraints((m).dtor_constraints, x, _dafny.ZERO, _dafny.Seq.of(), (m).dtor_nodes);
        let _1_nodes2 = ((m).dtor_nodes).Subtract(_dafny.Set.fromElements(x));
        return Canon.Model.create_Model(_1_nodes2, _0_cs2, (m).dtor_nextCid);
      }
    };
    static Canon(m) {
      return Canon.__default.ApplyAll(Canon.Model.create_Model((m).dtor_nodes, (m).dtor_constraints, (m).dtor_nextCid), _dafny.ZERO);
    };
    static ApplyAll(m, i) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber(((m).dtor_constraints).length)).isLessThanOrEqualTo(i)) {
          return m;
        } else {
          let _in0 = Canon.__default.ApplyOne(m, ((m).dtor_constraints)[i]);
          let _in1 = (i).plus(_dafny.ONE);
          m = _in0;
          i = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static ApplyOne(m, c) {
      let _source0 = c;
      {
        if (_source0.is_Align) {
          let _0_targets = (_source0).targets;
          let _1_axis = (_source0).axis;
          return Canon.Model.create_Model(Canon.__default.ApplyAlignNodes((m).dtor_nodes, _0_targets, _1_axis), (m).dtor_constraints, (m).dtor_nextCid);
        }
      }
      {
        let _2_targets = (_source0).targets;
        let _3_axis = (_source0).axis;
        return Canon.Model.create_Model(Canon.__default.ApplyEvenSpaceNodes((m).dtor_nodes, _2_targets, _3_axis), (m).dtor_constraints, (m).dtor_nextCid);
      }
    };
    static ApplyAlignNodes(nodes, targets, axis) {
      if ((new BigNumber((targets).length)).isEqualTo(_dafny.ZERO)) {
        return nodes;
      } else {
        let _0_anchor = Canon.__default.MeanAlong(nodes, targets, axis);
        return Canon.__default.ApplyAlignNodesFrom(nodes, targets, axis, _0_anchor, _dafny.ZERO);
      }
    };
    static ApplyAlignNodesFrom(nodes, targets, axis, anchor, i) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((targets).length)).isLessThanOrEqualTo(i)) {
          return nodes;
        } else {
          let _0_id = (targets)[i];
          if ((nodes).contains(_0_id)) {
            let _1_n = (nodes).get(_0_id);
            let _2_n2 = Canon.__default.SetCoord(_1_n, axis, anchor);
            let _in0 = (nodes).update(_0_id, _2_n2);
            let _in1 = targets;
            let _in2 = axis;
            let _in3 = anchor;
            let _in4 = (i).plus(_dafny.ONE);
            nodes = _in0;
            targets = _in1;
            axis = _in2;
            anchor = _in3;
            i = _in4;
            continue TAIL_CALL_START;
          } else {
            let _in5 = nodes;
            let _in6 = targets;
            let _in7 = axis;
            let _in8 = anchor;
            let _in9 = (i).plus(_dafny.ONE);
            nodes = _in5;
            targets = _in6;
            axis = _in7;
            anchor = _in8;
            i = _in9;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static ApplyEvenSpaceNodes(nodes, targets, axis) {
      let _0_ordered = Canon.__default.OrderTargets(nodes, targets, axis);
      if ((new BigNumber((_0_ordered).length)).isLessThanOrEqualTo(new BigNumber(2))) {
        return nodes;
      } else {
        let _1_a = Canon.__default.Coord((nodes).get((_0_ordered)[_dafny.ZERO]), axis);
        let _2_b = Canon.__default.Coord((nodes).get((_0_ordered)[(new BigNumber((_0_ordered).length)).minus(_dafny.ONE)]), axis);
        let _3_k = new BigNumber((_0_ordered).length);
        let _4_step = _dafny.EuclideanDivision((_2_b).minus(_1_a), (_3_k).minus(_dafny.ONE));
        return Canon.__default.ApplyEvenSpaceNodesFrom(nodes, _0_ordered, axis, _1_a, _4_step, _dafny.ZERO);
      }
    };
    static ApplyEvenSpaceNodesFrom(nodes, ordered, axis, a, step, i) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((ordered).length)).isLessThanOrEqualTo(i)) {
          return nodes;
        } else {
          let _0_id = (ordered)[i];
          let _1_n = (nodes).get(_0_id);
          let _2_pos = (a).plus((i).multipliedBy(step));
          let _3_n2 = Canon.__default.SetCoord(_1_n, axis, _2_pos);
          let _in0 = (nodes).update(_0_id, _3_n2);
          let _in1 = ordered;
          let _in2 = axis;
          let _in3 = a;
          let _in4 = step;
          let _in5 = (i).plus(_dafny.ONE);
          nodes = _in0;
          ordered = _in1;
          axis = _in2;
          a = _in3;
          step = _in4;
          i = _in5;
          continue TAIL_CALL_START;
        }
      }
    };
    static InferAxis(m, targets) {
      let _0_rx = Canon.__default.RangeAlong((m).dtor_nodes, targets, Canon.Axis.create_X());
      let _1_ry = Canon.__default.RangeAlong((m).dtor_nodes, targets, Canon.Axis.create_Y());
      if ((_1_ry).isLessThanOrEqualTo(_0_rx)) {
        return Canon.Axis.create_Y();
      } else {
        return Canon.Axis.create_X();
      }
    };
    static RangeAlong(nodes, targets, axis) {
      let _0_present = Canon.__default.FilterPresent(nodes, Canon.__default.Dedup(targets));
      if ((new BigNumber((_0_present).length)).isLessThanOrEqualTo(_dafny.ONE)) {
        return _dafny.ZERO;
      } else {
        let _1_mn = Canon.__default.MinAlong(nodes, _0_present, axis);
        let _2_mx = Canon.__default.MaxAlong(nodes, _0_present, axis);
        return (_2_mx).minus(_1_mn);
      }
    };
    static OrderTargets(nodes, targets, axis) {
      let _0_present = Canon.__default.FilterPresent(nodes, Canon.__default.Dedup(targets));
      return Canon.__default.InsertionSortByAxis(nodes, _0_present, axis, _dafny.ZERO, _dafny.Seq.of());
    };
    static InsertionSortByAxis(nodes, xs, axis, i, acc) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _0_id = (xs)[i];
          let _1_acc2 = Canon.__default.InsertByAxis(nodes, acc, _0_id, axis);
          let _in0 = nodes;
          let _in1 = xs;
          let _in2 = axis;
          let _in3 = (i).plus(_dafny.ONE);
          let _in4 = _1_acc2;
          nodes = _in0;
          xs = _in1;
          axis = _in2;
          i = _in3;
          acc = _in4;
          continue TAIL_CALL_START;
        }
      }
    };
    static InsertByAxis(nodes, acc, id, axis) {
      return Canon.__default.InsertByAxisFrom(nodes, acc, id, axis, _dafny.ZERO);
    };
    static InsertByAxisFrom(nodes, acc, id, axis, i) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((acc).length)).isLessThanOrEqualTo(i)) {
          return _dafny.Seq.Concat(acc, _dafny.Seq.of(id));
        } else {
          let _0_a = (acc)[i];
          if ((Canon.__default.Coord((nodes).get(id), axis)).isLessThanOrEqualTo(Canon.__default.Coord((nodes).get(_0_a), axis))) {
            return _dafny.Seq.Concat(_dafny.Seq.Concat((acc).slice(0, i), _dafny.Seq.of(id)), (acc).slice(i));
          } else {
            let _in0 = nodes;
            let _in1 = acc;
            let _in2 = id;
            let _in3 = axis;
            let _in4 = (i).plus(_dafny.ONE);
            nodes = _in0;
            acc = _in1;
            id = _in2;
            axis = _in3;
            i = _in4;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static RemoveFromSeq(xs, x, nodes) {
      return Canon.__default.RemoveFromSeqFrom(xs, x, _dafny.ZERO, _dafny.Seq.of(), nodes);
    };
    static RemoveFromSeqFrom(xs, x, i, acc, nodes) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else if (_dafny.areEqual((xs)[i], x)) {
          let _in0 = xs;
          let _in1 = x;
          let _in2 = (i).plus(_dafny.ONE);
          let _in3 = acc;
          let _in4 = nodes;
          xs = _in0;
          x = _in1;
          i = _in2;
          acc = _in3;
          nodes = _in4;
          continue TAIL_CALL_START;
        } else {
          let _in5 = xs;
          let _in6 = x;
          let _in7 = (i).plus(_dafny.ONE);
          let _in8 = _dafny.Seq.Concat(acc, _dafny.Seq.of((xs)[i]));
          let _in9 = nodes;
          xs = _in5;
          x = _in6;
          i = _in7;
          acc = _in8;
          nodes = _in9;
          continue TAIL_CALL_START;
        }
      }
    };
    static Dedup(xs) {
      return Canon.__default.DedupFrom(xs, _dafny.ZERO, _dafny.Set.fromElements(), _dafny.Seq.of());
    };
    static DedupFrom(xs, i, seen, acc) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _0_x = (xs)[i];
          if ((seen).contains(_0_x)) {
            let _in0 = xs;
            let _in1 = (i).plus(_dafny.ONE);
            let _in2 = seen;
            let _in3 = acc;
            xs = _in0;
            i = _in1;
            seen = _in2;
            acc = _in3;
            continue TAIL_CALL_START;
          } else {
            let _in4 = xs;
            let _in5 = (i).plus(_dafny.ONE);
            let _in6 = (seen).Union(_dafny.Set.fromElements(_0_x));
            let _in7 = _dafny.Seq.Concat(acc, _dafny.Seq.of(_0_x));
            xs = _in4;
            i = _in5;
            seen = _in6;
            acc = _in7;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static FilterPresent(nodes, xs) {
      return Canon.__default.FilterPresentFrom(nodes, xs, _dafny.ZERO, _dafny.Seq.of());
    };
    static FilterPresentFrom(nodes, xs, i, acc) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _0_x = (xs)[i];
          if ((nodes).contains(_0_x)) {
            let _in0 = nodes;
            let _in1 = xs;
            let _in2 = (i).plus(_dafny.ONE);
            let _in3 = _dafny.Seq.Concat(acc, _dafny.Seq.of(_0_x));
            nodes = _in0;
            xs = _in1;
            i = _in2;
            acc = _in3;
            continue TAIL_CALL_START;
          } else {
            let _in4 = nodes;
            let _in5 = xs;
            let _in6 = (i).plus(_dafny.ONE);
            let _in7 = acc;
            nodes = _in4;
            xs = _in5;
            i = _in6;
            acc = _in7;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static NodesFromSeq(ns) {
      return Canon.__default.NodesFromSeqFrom(ns, _dafny.ZERO, _dafny.Map.Empty.slice());
    };
    static NodesFromSeqFrom(ns, i, acc) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((ns).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _0_n = (ns)[i];
          let _in0 = ns;
          let _in1 = (i).plus(_dafny.ONE);
          let _in2 = (acc).update((_0_n).dtor_id, _0_n);
          ns = _in0;
          i = _in1;
          acc = _in2;
          continue TAIL_CALL_START;
        }
      }
    };
    static FilterOutCid(cs, cid, nodes) {
      return Canon.__default.FilterOutCidFrom(cs, cid, _dafny.ZERO, _dafny.Seq.of(), nodes);
    };
    static FilterOutCidFrom(cs, cid, i, acc, nodes) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _0_c = (cs)[i];
          if ((Canon.__default.CidOf(_0_c)).isEqualTo(cid)) {
            let _in0 = cs;
            let _in1 = cid;
            let _in2 = (i).plus(_dafny.ONE);
            let _in3 = acc;
            let _in4 = nodes;
            cs = _in0;
            cid = _in1;
            i = _in2;
            acc = _in3;
            nodes = _in4;
            continue TAIL_CALL_START;
          } else {
            let _in5 = cs;
            let _in6 = cid;
            let _in7 = (i).plus(_dafny.ONE);
            let _in8 = _dafny.Seq.Concat(acc, _dafny.Seq.of(_0_c));
            let _in9 = nodes;
            cs = _in5;
            cid = _in6;
            i = _in7;
            acc = _in8;
            nodes = _in9;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static CidOf(c) {
      let _source0 = c;
      {
        if (_source0.is_Align) {
          let _0_cid = (_source0).cid;
          return _0_cid;
        }
      }
      {
        let _1_cid = (_source0).cid;
        return _1_cid;
      }
    };
    static ShrinkConstraint(c, x, nodes) {
      let _source0 = c;
      {
        if (_source0.is_Align) {
          let _0_cid = (_source0).cid;
          let _1_targets = (_source0).targets;
          let _2_axis = (_source0).axis;
          let _3_t2 = Canon.__default.RemoveFromSeq(_1_targets, x, nodes);
          if ((new BigNumber((_3_t2).length)).isLessThan(new BigNumber(2))) {
            return _dafny.Tuple.of(false, c);
          } else {
            return _dafny.Tuple.of(true, Canon.Constraint.create_Align(_0_cid, _3_t2, _2_axis));
          }
        }
      }
      {
        let _4_cid = (_source0).cid;
        let _5_targets = (_source0).targets;
        let _6_axis = (_source0).axis;
        let _7_t2 = Canon.__default.RemoveFromSeq(_5_targets, x, nodes);
        if ((new BigNumber((_7_t2).length)).isLessThan(new BigNumber(3))) {
          return _dafny.Tuple.of(false, c);
        } else {
          return _dafny.Tuple.of(true, Canon.Constraint.create_EvenSpace(_4_cid, _7_t2, _6_axis));
        }
      }
    };
    static ShrinkConstraints(cs, x, i, acc, nodes) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _0_c = (cs)[i];
          let _let_tmp_rhs0 = Canon.__default.ShrinkConstraint(_0_c, x, nodes);
          let _1_keep = (_let_tmp_rhs0)[0];
          let _2_c2 = (_let_tmp_rhs0)[1];
          if (_1_keep) {
            let _in0 = cs;
            let _in1 = x;
            let _in2 = (i).plus(_dafny.ONE);
            let _in3 = _dafny.Seq.Concat(acc, _dafny.Seq.of(_2_c2));
            let _in4 = nodes;
            cs = _in0;
            x = _in1;
            i = _in2;
            acc = _in3;
            nodes = _in4;
            continue TAIL_CALL_START;
          } else {
            let _in5 = cs;
            let _in6 = x;
            let _in7 = (i).plus(_dafny.ONE);
            let _in8 = acc;
            let _in9 = nodes;
            cs = _in5;
            x = _in6;
            i = _in7;
            acc = _in8;
            nodes = _in9;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static MinAlong(nodes, xs, axis) {
      return Canon.__default.MinAlongFrom(nodes, xs, axis, _dafny.ONE, Canon.__default.Coord((nodes).get((xs)[_dafny.ZERO]), axis));
    };
    static MinAlongFrom(nodes, xs, axis, i, cur) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return cur;
        } else {
          let _0_v = Canon.__default.Coord((nodes).get((xs)[i]), axis);
          let _in0 = nodes;
          let _in1 = xs;
          let _in2 = axis;
          let _in3 = (i).plus(_dafny.ONE);
          let _in4 = (((_0_v).isLessThan(cur)) ? (_0_v) : (cur));
          nodes = _in0;
          xs = _in1;
          axis = _in2;
          i = _in3;
          cur = _in4;
          continue TAIL_CALL_START;
        }
      }
    };
    static MaxAlong(nodes, xs, axis) {
      return Canon.__default.MaxAlongFrom(nodes, xs, axis, _dafny.ONE, Canon.__default.Coord((nodes).get((xs)[_dafny.ZERO]), axis));
    };
    static MaxAlongFrom(nodes, xs, axis, i, cur) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return cur;
        } else {
          let _0_v = Canon.__default.Coord((nodes).get((xs)[i]), axis);
          let _in0 = nodes;
          let _in1 = xs;
          let _in2 = axis;
          let _in3 = (i).plus(_dafny.ONE);
          let _in4 = (((cur).isLessThan(_0_v)) ? (_0_v) : (cur));
          nodes = _in0;
          xs = _in1;
          axis = _in2;
          i = _in3;
          cur = _in4;
          continue TAIL_CALL_START;
        }
      }
    };
    static SumAlong(nodes, xs, axis) {
      return Canon.__default.SumAlongFrom(nodes, xs, axis, _dafny.ZERO, _dafny.ZERO);
    };
    static SumAlongFrom(nodes, xs, axis, i, acc) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((xs).length)).isLessThanOrEqualTo(i)) {
          return acc;
        } else {
          let _in0 = nodes;
          let _in1 = xs;
          let _in2 = axis;
          let _in3 = (i).plus(_dafny.ONE);
          let _in4 = (acc).plus(Canon.__default.Coord((nodes).get((xs)[i]), axis));
          nodes = _in0;
          xs = _in1;
          axis = _in2;
          i = _in3;
          acc = _in4;
          continue TAIL_CALL_START;
        }
      }
    };
    static MeanAlong(nodes, xs, axis) {
      return _dafny.EuclideanDivision(Canon.__default.SumAlong(nodes, xs, axis), new BigNumber((xs).length));
    };
  };

  $module.Node = class Node {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Node(id, x, y) {
      let $dt = new Node(0);
      $dt.id = id;
      $dt.x = x;
      $dt.y = y;
      return $dt;
    }
    get is_Node() { return this.$tag === 0; }
    get dtor_id() { return this.id; }
    get dtor_x() { return this.x; }
    get dtor_y() { return this.y; }
    toString() {
      if (this.$tag === 0) {
        return "Canon.Node.Node" + "(" + this.id.toVerbatimString(true) + ", " + _dafny.toString(this.x) + ", " + _dafny.toString(this.y) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.id, other.id) && _dafny.areEqual(this.x, other.x) && _dafny.areEqual(this.y, other.y);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return Canon.Node.create_Node(_dafny.Seq.UnicodeFromString(""), _dafny.ZERO, _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Node.Default();
        }
      };
    }
  }

  $module.Axis = class Axis {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_X() {
      let $dt = new Axis(0);
      return $dt;
    }
    static create_Y() {
      let $dt = new Axis(1);
      return $dt;
    }
    get is_X() { return this.$tag === 0; }
    get is_Y() { return this.$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Axis.create_X();
      yield Axis.create_Y();
    }
    toString() {
      if (this.$tag === 0) {
        return "Canon.Axis.X";
      } else if (this.$tag === 1) {
        return "Canon.Axis.Y";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0;
      } else if (this.$tag === 1) {
        return other.$tag === 1;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return Canon.Axis.create_X();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Axis.Default();
        }
      };
    }
  }

  $module.Constraint = class Constraint {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Align(cid, targets, axis) {
      let $dt = new Constraint(0);
      $dt.cid = cid;
      $dt.targets = targets;
      $dt.axis = axis;
      return $dt;
    }
    static create_EvenSpace(cid, targets, axis) {
      let $dt = new Constraint(1);
      $dt.cid = cid;
      $dt.targets = targets;
      $dt.axis = axis;
      return $dt;
    }
    get is_Align() { return this.$tag === 0; }
    get is_EvenSpace() { return this.$tag === 1; }
    get dtor_cid() { return this.cid; }
    get dtor_targets() { return this.targets; }
    get dtor_axis() { return this.axis; }
    toString() {
      if (this.$tag === 0) {
        return "Canon.Constraint.Align" + "(" + _dafny.toString(this.cid) + ", " + _dafny.toString(this.targets) + ", " + _dafny.toString(this.axis) + ")";
      } else if (this.$tag === 1) {
        return "Canon.Constraint.EvenSpace" + "(" + _dafny.toString(this.cid) + ", " + _dafny.toString(this.targets) + ", " + _dafny.toString(this.axis) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.cid, other.cid) && _dafny.areEqual(this.targets, other.targets) && _dafny.areEqual(this.axis, other.axis);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.cid, other.cid) && _dafny.areEqual(this.targets, other.targets) && _dafny.areEqual(this.axis, other.axis);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return Canon.Constraint.create_Align(_dafny.ZERO, _dafny.Seq.of(), Canon.Axis.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Constraint.Default();
        }
      };
    }
  }

  $module.Model = class Model {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Model(nodes, constraints, nextCid) {
      let $dt = new Model(0);
      $dt.nodes = nodes;
      $dt.constraints = constraints;
      $dt.nextCid = nextCid;
      return $dt;
    }
    get is_Model() { return this.$tag === 0; }
    get dtor_nodes() { return this.nodes; }
    get dtor_constraints() { return this.constraints; }
    get dtor_nextCid() { return this.nextCid; }
    toString() {
      if (this.$tag === 0) {
        return "Canon.Model.Model" + "(" + _dafny.toString(this.nodes) + ", " + _dafny.toString(this.constraints) + ", " + _dafny.toString(this.nextCid) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.nodes, other.nodes) && _dafny.areEqual(this.constraints, other.constraints) && _dafny.areEqual(this.nextCid, other.nextCid);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return Canon.Model.create_Model(_dafny.Map.Empty, _dafny.Seq.of(), _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Model.Default();
        }
      };
    }
  }
  return $module;
})(); // end of module Canon
let _module = (function() {
  let $module = {};

  return $module;
})(); // end of module _module
