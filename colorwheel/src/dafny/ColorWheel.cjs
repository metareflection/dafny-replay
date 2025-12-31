// Dafny program ColorWheelDomain.dfy compiled into JavaScript
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
let ColorWheelSpec = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ColorWheelSpec._default";
    }
    _parentTraits() {
      return [];
    }
    static Clamp(x, min, max) {
      if ((x).isLessThan(min)) {
        return min;
      } else if ((max).isLessThan(x)) {
        return max;
      } else {
        return x;
      }
    };
    static NormalizeHue(h) {
      let _0_normalized = (h).mod(new BigNumber(360));
      if ((_0_normalized).isLessThan(_dafny.ZERO)) {
        return (_0_normalized).plus(new BigNumber(360));
      } else {
        return _0_normalized;
      }
    };
    static ClampColor(c) {
      return ColorWheelSpec.Color.create_Color(ColorWheelSpec.__default.NormalizeHue((c).dtor_h), ColorWheelSpec.__default.Clamp((c).dtor_s, _dafny.ZERO, new BigNumber(100)), ColorWheelSpec.__default.Clamp((c).dtor_l, _dafny.ZERO, new BigNumber(100)));
    };
    static ValidColor(c) {
      return ((((_dafny.ZERO).isLessThanOrEqualTo((c).dtor_h)) && (((c).dtor_h).isLessThan(new BigNumber(360)))) && (((_dafny.ZERO).isLessThanOrEqualTo((c).dtor_s)) && (((c).dtor_s).isLessThanOrEqualTo(new BigNumber(100))))) && (((_dafny.ZERO).isLessThanOrEqualTo((c).dtor_l)) && (((c).dtor_l).isLessThanOrEqualTo(new BigNumber(100))));
    };
    static ValidBaseHue(h) {
      return ((_dafny.ZERO).isLessThanOrEqualTo(h)) && ((h).isLessThan(new BigNumber(360)));
    };
    static ColorSatisfiesMood(c, mood) {
      let _source0 = mood;
      {
        if (_source0.is_Vibrant) {
          return ((new BigNumber(70)).isLessThanOrEqualTo((c).dtor_s)) && (((new BigNumber(40)).isLessThanOrEqualTo((c).dtor_l)) && (((c).dtor_l).isLessThanOrEqualTo(new BigNumber(60))));
        }
      }
      {
        if (_source0.is_SoftMuted) {
          return (((new BigNumber(20)).isLessThanOrEqualTo((c).dtor_s)) && (((c).dtor_s).isLessThanOrEqualTo(new BigNumber(45)))) && (((new BigNumber(55)).isLessThanOrEqualTo((c).dtor_l)) && (((c).dtor_l).isLessThanOrEqualTo(new BigNumber(75))));
        }
      }
      {
        if (_source0.is_Pastel) {
          return (((c).dtor_s).isLessThanOrEqualTo(new BigNumber(35))) && ((new BigNumber(75)).isLessThanOrEqualTo((c).dtor_l));
        }
      }
      {
        if (_source0.is_DeepJewel) {
          return ((new BigNumber(60)).isLessThanOrEqualTo((c).dtor_s)) && (((new BigNumber(25)).isLessThanOrEqualTo((c).dtor_l)) && (((c).dtor_l).isLessThanOrEqualTo(new BigNumber(45))));
        }
      }
      {
        if (_source0.is_Earth) {
          return (((new BigNumber(15)).isLessThanOrEqualTo((c).dtor_s)) && (((c).dtor_s).isLessThanOrEqualTo(new BigNumber(40)))) && (((new BigNumber(30)).isLessThanOrEqualTo((c).dtor_l)) && (((c).dtor_l).isLessThanOrEqualTo(new BigNumber(60))));
        }
      }
      {
        if (_source0.is_Neon) {
          return ((new BigNumber(90)).isLessThanOrEqualTo((c).dtor_s)) && (((new BigNumber(50)).isLessThanOrEqualTo((c).dtor_l)) && (((c).dtor_l).isLessThanOrEqualTo(new BigNumber(65))));
        }
      }
      {
        return true;
      }
    };
    static MoodBounds(mood) {
      let _source0 = mood;
      {
        if (_source0.is_Vibrant) {
          return _dafny.Tuple.of(new BigNumber(70), new BigNumber(100), new BigNumber(40), new BigNumber(60));
        }
      }
      {
        if (_source0.is_SoftMuted) {
          return _dafny.Tuple.of(new BigNumber(20), new BigNumber(45), new BigNumber(55), new BigNumber(75));
        }
      }
      {
        if (_source0.is_Pastel) {
          return _dafny.Tuple.of(_dafny.ZERO, new BigNumber(35), new BigNumber(75), new BigNumber(100));
        }
      }
      {
        if (_source0.is_DeepJewel) {
          return _dafny.Tuple.of(new BigNumber(60), new BigNumber(100), new BigNumber(25), new BigNumber(45));
        }
      }
      {
        if (_source0.is_Earth) {
          return _dafny.Tuple.of(new BigNumber(15), new BigNumber(40), new BigNumber(30), new BigNumber(60));
        }
      }
      {
        if (_source0.is_Neon) {
          return _dafny.Tuple.of(new BigNumber(90), new BigNumber(100), new BigNumber(50), new BigNumber(65));
        }
      }
      {
        return _dafny.Tuple.of(_dafny.ZERO, new BigNumber(100), _dafny.ZERO, new BigNumber(100));
      }
    };
    static RandomInRange(seed, min, max) {
      if ((min).isEqualTo(max)) {
        return min;
      } else {
        return (min).plus(_dafny.EuclideanDivision((seed).multipliedBy((max).minus(min)), new BigNumber(100)));
      }
    };
    static RandomSLForMood(mood, seedS, seedL) {
      let _let_tmp_rhs0 = ColorWheelSpec.__default.MoodBounds(mood);
      let _0_minS = (_let_tmp_rhs0)[0];
      let _1_maxS = (_let_tmp_rhs0)[1];
      let _2_minL = (_let_tmp_rhs0)[2];
      let _3_maxL = (_let_tmp_rhs0)[3];
      return _dafny.Tuple.of(ColorWheelSpec.__default.RandomInRange(seedS, _0_minS, _1_maxS), ColorWheelSpec.__default.RandomInRange(seedL, _2_minL, _3_maxL));
    };
    static GoldenSLForMood(mood, colorIndex, seedS, seedL) {
      let _let_tmp_rhs0 = ColorWheelSpec.__default.MoodBounds(mood);
      let _0_minS = (_let_tmp_rhs0)[0];
      let _1_maxS = (_let_tmp_rhs0)[1];
      let _2_minL = (_let_tmp_rhs0)[2];
      let _3_maxL = (_let_tmp_rhs0)[3];
      let _4_spreadS = ((seedS).plus((colorIndex).multipliedBy(ColorWheelSpec.__default.GoldenOffset))).mod(new BigNumber(101));
      let _5_spreadL = ((seedL).plus((colorIndex).multipliedBy(new BigNumber(38)))).mod(new BigNumber(101));
      return _dafny.Tuple.of(ColorWheelSpec.__default.RandomInRange(_4_spreadS, _0_minS, _1_maxS), ColorWheelSpec.__default.RandomInRange(_5_spreadL, _2_minL, _3_maxL));
    };
    static BaseHarmonyHues(baseHue, harmony) {
      let _source0 = harmony;
      {
        if (_source0.is_Complementary) {
          return _dafny.Seq.of(baseHue, ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(180))));
        }
      }
      {
        if (_source0.is_Triadic) {
          return _dafny.Seq.of(baseHue, ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(120))), ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(240))));
        }
      }
      {
        if (_source0.is_Analogous) {
          return _dafny.Seq.of(ColorWheelSpec.__default.NormalizeHue((baseHue).minus(new BigNumber(30))), ColorWheelSpec.__default.NormalizeHue((baseHue).minus(new BigNumber(15))), baseHue, ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(15))), ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(30))));
        }
      }
      {
        if (_source0.is_SplitComplement) {
          return _dafny.Seq.of(baseHue, ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(150))), ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(210))));
        }
      }
      {
        if (_source0.is_Square) {
          return _dafny.Seq.of(baseHue, ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(90))), ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(180))), ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(270))));
        }
      }
      {
        return _dafny.Seq.of();
      }
    };
    static AllHarmonyHues(baseHue, harmony) {
      let _0_base = ColorWheelSpec.__default.BaseHarmonyHues(baseHue, harmony);
      if (_dafny.areEqual(harmony, ColorWheelSpec.Harmony.create_Custom())) {
        return _dafny.Seq.of();
      } else if ((new BigNumber((_0_base).length)).isEqualTo(new BigNumber(5))) {
        return _0_base;
      } else if ((new BigNumber((_0_base).length)).isEqualTo(new BigNumber(4))) {
        return _dafny.Seq.Concat(_0_base, _dafny.Seq.of(ColorWheelSpec.__default.NormalizeHue((baseHue).plus(new BigNumber(45)))));
      } else if ((new BigNumber((_0_base).length)).isEqualTo(new BigNumber(3))) {
        return _dafny.Seq.Concat(_0_base, _dafny.Seq.of(ColorWheelSpec.__default.NormalizeHue(((_0_base)[_dafny.ZERO]).plus(ColorWheelSpec.__default.HueSpread)), ColorWheelSpec.__default.NormalizeHue(((_0_base)[_dafny.ONE]).minus(ColorWheelSpec.__default.HueSpread))));
      } else if ((new BigNumber((_0_base).length)).isEqualTo(new BigNumber(2))) {
        return _dafny.Seq.Concat(_0_base, _dafny.Seq.of(ColorWheelSpec.__default.NormalizeHue(((_0_base)[_dafny.ZERO]).plus(ColorWheelSpec.__default.HueSpread)), ColorWheelSpec.__default.NormalizeHue(((_0_base)[_dafny.ONE]).plus(ColorWheelSpec.__default.HueSpread)), ColorWheelSpec.__default.NormalizeHue(((_0_base)[_dafny.ZERO]).minus(ColorWheelSpec.__default.HueSpread))));
      } else {
        return _dafny.Seq.of();
      }
    };
    static HuesMatchHarmony(colors, baseHue, harmony) {
      if (_dafny.areEqual(harmony, ColorWheelSpec.Harmony.create_Custom())) {
        return true;
      } else {
        let _0_expectedHues = ColorWheelSpec.__default.AllHarmonyHues(baseHue, harmony);
        return (((new BigNumber((colors).length)).isEqualTo(new BigNumber(5))) && ((new BigNumber((_0_expectedHues).length)).isEqualTo(new BigNumber(5)))) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(5)), true, function (_forall_var_0) {
          let _1_i = _forall_var_0;
          return !(((_dafny.ZERO).isLessThanOrEqualTo(_1_i)) && ((_1_i).isLessThan(new BigNumber(5)))) || ((((colors)[_1_i]).dtor_h).isEqualTo((_0_expectedHues)[_1_i]));
        }));
      }
    };
    static Inv(m) {
      return ((((((ColorWheelSpec.__default.ValidBaseHue((m).dtor_baseHue)) && ((new BigNumber(((m).dtor_colors).length)).isEqualTo(new BigNumber(5)))) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(5)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber(5)))) || (ColorWheelSpec.__default.ValidColor(((m).dtor_colors)[_0_i]));
      }))) && (((_dafny.ZERO).isLessThanOrEqualTo(((m).dtor_contrastPair)[0])) && ((((m).dtor_contrastPair)[0]).isLessThan(new BigNumber(5))))) && (((_dafny.ZERO).isLessThanOrEqualTo(((m).dtor_contrastPair)[1])) && ((((m).dtor_contrastPair)[1]).isLessThan(new BigNumber(5))))) && (!(!_dafny.areEqual((m).dtor_mood, ColorWheelSpec.Mood.create_Custom())) || (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(5)), true, function (_forall_var_1) {
        let _1_i = _forall_var_1;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_1_i)) && ((_1_i).isLessThan(new BigNumber(5)))) || (ColorWheelSpec.__default.ColorSatisfiesMood(((m).dtor_colors)[_1_i], (m).dtor_mood));
      })))) && (ColorWheelSpec.__default.HuesMatchHarmony((m).dtor_colors, (m).dtor_baseHue, (m).dtor_harmony));
    };
    static Init() {
      let _0_randomSeeds = _dafny.Seq.of(new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50), new BigNumber(50));
      let _1_baseHue = new BigNumber(180);
      let _2_mood = ColorWheelSpec.Mood.create_Vibrant();
      let _3_harmony = ColorWheelSpec.Harmony.create_Complementary();
      let _4_colors = ColorWheelSpec.__default.GeneratePaletteColors(_1_baseHue, _2_mood, _3_harmony, _0_randomSeeds);
      return ColorWheelSpec.Model.create_Model(_1_baseHue, _2_mood, _3_harmony, _4_colors, _dafny.Tuple.of(_dafny.ZERO, _dafny.ONE), _dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
    };
    static ValidRandomSeeds(seeds) {
      return ((new BigNumber((seeds).length)).isEqualTo(new BigNumber(10))) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(10)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber(10)))) || (((_dafny.ZERO).isLessThanOrEqualTo((seeds)[_0_i])) && (((seeds)[_0_i]).isLessThanOrEqualTo(new BigNumber(100))));
      }));
    };
    static AllColorsSatisfyMood(colors, mood) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(5)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber(5)))) || (ColorWheelSpec.__default.ColorSatisfiesMood((colors)[_0_i], mood));
      });
    };
    static GenerateColorGolden(h, mood, colorIndex, seedS, seedL) {
      let _let_tmp_rhs0 = ColorWheelSpec.__default.GoldenSLForMood(mood, colorIndex, seedS, seedL);
      let _0_s = (_let_tmp_rhs0)[0];
      let _1_l = (_let_tmp_rhs0)[1];
      return ColorWheelSpec.Color.create_Color(h, _0_s, _1_l);
    };
    static GeneratePaletteColors(baseHue, mood, harmony, randomSeeds) {
      let _0_hues = ColorWheelSpec.__default.AllHarmonyHues(baseHue, harmony);
      if (!(new BigNumber((_0_hues).length)).isEqualTo(new BigNumber(5))) {
        return _dafny.Seq.of(ColorWheelSpec.__default.GenerateColorGolden(baseHue, mood, _dafny.ZERO, (randomSeeds)[_dafny.ZERO], (randomSeeds)[_dafny.ONE]), ColorWheelSpec.__default.GenerateColorGolden(baseHue, mood, _dafny.ONE, (randomSeeds)[new BigNumber(2)], (randomSeeds)[new BigNumber(3)]), ColorWheelSpec.__default.GenerateColorGolden(baseHue, mood, new BigNumber(2), (randomSeeds)[new BigNumber(4)], (randomSeeds)[new BigNumber(5)]), ColorWheelSpec.__default.GenerateColorGolden(baseHue, mood, new BigNumber(3), (randomSeeds)[new BigNumber(6)], (randomSeeds)[new BigNumber(7)]), ColorWheelSpec.__default.GenerateColorGolden(baseHue, mood, new BigNumber(4), (randomSeeds)[new BigNumber(8)], (randomSeeds)[new BigNumber(9)]));
      } else {
        return _dafny.Seq.of(ColorWheelSpec.__default.GenerateColorGolden((_0_hues)[_dafny.ZERO], mood, _dafny.ZERO, (randomSeeds)[_dafny.ZERO], (randomSeeds)[_dafny.ONE]), ColorWheelSpec.__default.GenerateColorGolden((_0_hues)[_dafny.ONE], mood, _dafny.ONE, (randomSeeds)[new BigNumber(2)], (randomSeeds)[new BigNumber(3)]), ColorWheelSpec.__default.GenerateColorGolden((_0_hues)[new BigNumber(2)], mood, new BigNumber(2), (randomSeeds)[new BigNumber(4)], (randomSeeds)[new BigNumber(5)]), ColorWheelSpec.__default.GenerateColorGolden((_0_hues)[new BigNumber(3)], mood, new BigNumber(3), (randomSeeds)[new BigNumber(6)], (randomSeeds)[new BigNumber(7)]), ColorWheelSpec.__default.GenerateColorGolden((_0_hues)[new BigNumber(4)], mood, new BigNumber(4), (randomSeeds)[new BigNumber(8)], (randomSeeds)[new BigNumber(9)]));
      }
    };
    static Apply(m, a) {
      let _source0 = a;
      {
        if (_source0.is_GeneratePalette) {
          let _0_baseHue = (_source0).baseHue;
          let _1_mood = (_source0).mood;
          let _2_harmony = (_source0).harmony;
          let _3_randomSeeds = (_source0).randomSeeds;
          if ((!(ColorWheelSpec.__default.ValidBaseHue(_0_baseHue))) || (!(ColorWheelSpec.__default.ValidRandomSeeds(_3_randomSeeds)))) {
            return m;
          } else {
            let _4_colors = ColorWheelSpec.__default.GeneratePaletteColors(_0_baseHue, _1_mood, _2_harmony, _3_randomSeeds);
            let _5_dt__update__tmp_h0 = m;
            let _6_dt__update_hadjustmentL_h0 = _dafny.ZERO;
            let _7_dt__update_hadjustmentS_h0 = _dafny.ZERO;
            let _8_dt__update_hadjustmentH_h0 = _dafny.ZERO;
            let _9_dt__update_hcolors_h0 = _4_colors;
            let _10_dt__update_hharmony_h0 = _2_harmony;
            let _11_dt__update_hmood_h0 = _1_mood;
            let _12_dt__update_hbaseHue_h0 = _0_baseHue;
            return ColorWheelSpec.Model.create_Model(_12_dt__update_hbaseHue_h0, _11_dt__update_hmood_h0, _10_dt__update_hharmony_h0, _9_dt__update_hcolors_h0, (_5_dt__update__tmp_h0).dtor_contrastPair, _8_dt__update_hadjustmentH_h0, _7_dt__update_hadjustmentS_h0, _6_dt__update_hadjustmentL_h0);
          }
        }
      }
      {
        if (_source0.is_AdjustColor) {
          let _13_index = (_source0).index;
          let _14_deltaH = (_source0).deltaH;
          let _15_deltaS = (_source0).deltaS;
          let _16_deltaL = (_source0).deltaL;
          if (((_13_index).isLessThan(_dafny.ZERO)) || ((new BigNumber(((m).dtor_colors).length)).isLessThanOrEqualTo(_13_index))) {
            return m;
          } else {
            return ColorWheelSpec.__default.ApplyIndependentAdjustment(m, _13_index, _14_deltaH, _15_deltaS, _16_deltaL);
          }
        }
      }
      {
        if (_source0.is_AdjustPalette) {
          let _17_deltaH = (_source0).deltaH;
          let _18_deltaS = (_source0).deltaS;
          let _19_deltaL = (_source0).deltaL;
          let _20_adjusted = ColorWheelSpec.__default.ApplyLinkedAdjustment(m, _17_deltaH, _18_deltaS, _19_deltaL);
          let _21_dt__update__tmp_h1 = _20_adjusted;
          let _22_dt__update_hadjustmentL_h1 = ((m).dtor_adjustmentL).plus(_19_deltaL);
          let _23_dt__update_hadjustmentS_h1 = ((m).dtor_adjustmentS).plus(_18_deltaS);
          let _24_dt__update_hadjustmentH_h1 = ((m).dtor_adjustmentH).plus(_17_deltaH);
          return ColorWheelSpec.Model.create_Model((_21_dt__update__tmp_h1).dtor_baseHue, (_21_dt__update__tmp_h1).dtor_mood, (_21_dt__update__tmp_h1).dtor_harmony, (_21_dt__update__tmp_h1).dtor_colors, (_21_dt__update__tmp_h1).dtor_contrastPair, _24_dt__update_hadjustmentH_h1, _23_dt__update_hadjustmentS_h1, _22_dt__update_hadjustmentL_h1);
        }
      }
      {
        if (_source0.is_SelectContrastPair) {
          let _25_fg = (_source0).fg;
          let _26_bg = (_source0).bg;
          if ((((_dafny.ZERO).isLessThanOrEqualTo(_25_fg)) && ((_25_fg).isLessThan(new BigNumber(5)))) && (((_dafny.ZERO).isLessThanOrEqualTo(_26_bg)) && ((_26_bg).isLessThan(new BigNumber(5))))) {
            let _27_dt__update__tmp_h2 = m;
            let _28_dt__update_hcontrastPair_h0 = _dafny.Tuple.of(_25_fg, _26_bg);
            return ColorWheelSpec.Model.create_Model((_27_dt__update__tmp_h2).dtor_baseHue, (_27_dt__update__tmp_h2).dtor_mood, (_27_dt__update__tmp_h2).dtor_harmony, (_27_dt__update__tmp_h2).dtor_colors, _28_dt__update_hcontrastPair_h0, (_27_dt__update__tmp_h2).dtor_adjustmentH, (_27_dt__update__tmp_h2).dtor_adjustmentS, (_27_dt__update__tmp_h2).dtor_adjustmentL);
          } else {
            return m;
          }
        }
      }
      {
        if (_source0.is_SetColorDirect) {
          let _29_index = (_source0).index;
          let _30_color = (_source0).color;
          if (((_29_index).isLessThan(_dafny.ZERO)) || ((new BigNumber(((m).dtor_colors).length)).isLessThanOrEqualTo(_29_index))) {
            return m;
          } else {
            return ColorWheelSpec.__default.ApplySetColorDirect(m, _29_index, _30_color);
          }
        }
      }
      {
        if (_source0.is_RegenerateMood) {
          let _31_mood = (_source0).mood;
          let _32_randomSeeds = (_source0).randomSeeds;
          if (!(ColorWheelSpec.__default.ValidRandomSeeds(_32_randomSeeds))) {
            return m;
          } else {
            let _33_colors = ColorWheelSpec.__default.GeneratePaletteColors((m).dtor_baseHue, _31_mood, (m).dtor_harmony, _32_randomSeeds);
            let _34_dt__update__tmp_h3 = m;
            let _35_dt__update_hadjustmentL_h2 = _dafny.ZERO;
            let _36_dt__update_hadjustmentS_h2 = _dafny.ZERO;
            let _37_dt__update_hadjustmentH_h2 = _dafny.ZERO;
            let _38_dt__update_hcolors_h1 = _33_colors;
            let _39_dt__update_hmood_h1 = _31_mood;
            return ColorWheelSpec.Model.create_Model((_34_dt__update__tmp_h3).dtor_baseHue, _39_dt__update_hmood_h1, (_34_dt__update__tmp_h3).dtor_harmony, _38_dt__update_hcolors_h1, (_34_dt__update__tmp_h3).dtor_contrastPair, _37_dt__update_hadjustmentH_h2, _36_dt__update_hadjustmentS_h2, _35_dt__update_hadjustmentL_h2);
          }
        }
      }
      {
        if (_source0.is_RegenerateHarmony) {
          let _40_harmony = (_source0).harmony;
          let _41_randomSeeds = (_source0).randomSeeds;
          if (!(ColorWheelSpec.__default.ValidRandomSeeds(_41_randomSeeds))) {
            return m;
          } else {
            let _42_colors = ColorWheelSpec.__default.GeneratePaletteColors((m).dtor_baseHue, (m).dtor_mood, _40_harmony, _41_randomSeeds);
            let _43_dt__update__tmp_h4 = m;
            let _44_dt__update_hadjustmentL_h3 = _dafny.ZERO;
            let _45_dt__update_hadjustmentS_h3 = _dafny.ZERO;
            let _46_dt__update_hadjustmentH_h3 = _dafny.ZERO;
            let _47_dt__update_hcolors_h2 = _42_colors;
            let _48_dt__update_hharmony_h1 = _40_harmony;
            return ColorWheelSpec.Model.create_Model((_43_dt__update__tmp_h4).dtor_baseHue, (_43_dt__update__tmp_h4).dtor_mood, _48_dt__update_hharmony_h1, _47_dt__update_hcolors_h2, (_43_dt__update__tmp_h4).dtor_contrastPair, _46_dt__update_hadjustmentH_h3, _45_dt__update_hadjustmentS_h3, _44_dt__update_hadjustmentL_h3);
          }
        }
      }
      {
        let _49_newBaseHue = (_source0).newBaseHue;
        let _50_randomSeeds = (_source0).randomSeeds;
        if ((!(ColorWheelSpec.__default.ValidBaseHue(_49_newBaseHue))) || (!(ColorWheelSpec.__default.ValidRandomSeeds(_50_randomSeeds)))) {
          return m;
        } else {
          let _51_colors = ColorWheelSpec.__default.GeneratePaletteColors(_49_newBaseHue, (m).dtor_mood, (m).dtor_harmony, _50_randomSeeds);
          let _52_dt__update__tmp_h5 = m;
          let _53_dt__update_hadjustmentL_h4 = _dafny.ZERO;
          let _54_dt__update_hadjustmentS_h4 = _dafny.ZERO;
          let _55_dt__update_hadjustmentH_h4 = _dafny.ZERO;
          let _56_dt__update_hcolors_h3 = _51_colors;
          let _57_dt__update_hbaseHue_h1 = _49_newBaseHue;
          return ColorWheelSpec.Model.create_Model(_57_dt__update_hbaseHue_h1, (_52_dt__update__tmp_h5).dtor_mood, (_52_dt__update__tmp_h5).dtor_harmony, _56_dt__update_hcolors_h3, (_52_dt__update__tmp_h5).dtor_contrastPair, _55_dt__update_hadjustmentH_h4, _54_dt__update_hadjustmentS_h4, _53_dt__update_hadjustmentL_h4);
        }
      }
    };
    static ApplyLinkedAdjustment(m, deltaH, deltaS, deltaL) {
      let _0_newBaseHue = ColorWheelSpec.__default.NormalizeHue(((m).dtor_baseHue).plus(deltaH));
      let _1_newHues = ColorWheelSpec.__default.AllHarmonyHues(_0_newBaseHue, (m).dtor_harmony);
      let _2_adjustedColors = (((new BigNumber((_1_newHues).length)).isEqualTo(new BigNumber(5))) ? (_dafny.Seq.of(ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[_dafny.ZERO], (_1_newHues)[_dafny.ZERO], deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[_dafny.ONE], (_1_newHues)[_dafny.ONE], deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[new BigNumber(2)], (_1_newHues)[new BigNumber(2)], deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[new BigNumber(3)], (_1_newHues)[new BigNumber(3)], deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[new BigNumber(4)], (_1_newHues)[new BigNumber(4)], deltaS, deltaL))) : (_dafny.Seq.of(ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[_dafny.ZERO], ColorWheelSpec.__default.NormalizeHue(((((m).dtor_colors)[_dafny.ZERO]).dtor_h).plus(deltaH)), deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[_dafny.ONE], ColorWheelSpec.__default.NormalizeHue(((((m).dtor_colors)[_dafny.ONE]).dtor_h).plus(deltaH)), deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[new BigNumber(2)], ColorWheelSpec.__default.NormalizeHue(((((m).dtor_colors)[new BigNumber(2)]).dtor_h).plus(deltaH)), deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[new BigNumber(3)], ColorWheelSpec.__default.NormalizeHue(((((m).dtor_colors)[new BigNumber(3)]).dtor_h).plus(deltaH)), deltaS, deltaL), ColorWheelSpec.__default.AdjustColorSL(((m).dtor_colors)[new BigNumber(4)], ColorWheelSpec.__default.NormalizeHue(((((m).dtor_colors)[new BigNumber(4)]).dtor_h).plus(deltaH)), deltaS, deltaL))));
      let _3_moodBroken = (!_dafny.areEqual((m).dtor_mood, ColorWheelSpec.Mood.create_Custom())) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(5)), false, function (_exists_var_0) {
        let _4_i = _exists_var_0;
        return (((_dafny.ZERO).isLessThanOrEqualTo(_4_i)) && ((_4_i).isLessThan(new BigNumber(5)))) && (!(ColorWheelSpec.__default.ColorSatisfiesMood((_2_adjustedColors)[_4_i], (m).dtor_mood)));
      }));
      let _5_newMood = ((_3_moodBroken) ? (ColorWheelSpec.Mood.create_Custom()) : ((m).dtor_mood));
      let _6_dt__update__tmp_h0 = m;
      let _7_dt__update_hmood_h0 = _5_newMood;
      let _8_dt__update_hcolors_h0 = _2_adjustedColors;
      let _9_dt__update_hbaseHue_h0 = _0_newBaseHue;
      return ColorWheelSpec.Model.create_Model(_9_dt__update_hbaseHue_h0, _7_dt__update_hmood_h0, (_6_dt__update__tmp_h0).dtor_harmony, _8_dt__update_hcolors_h0, (_6_dt__update__tmp_h0).dtor_contrastPair, (_6_dt__update__tmp_h0).dtor_adjustmentH, (_6_dt__update__tmp_h0).dtor_adjustmentS, (_6_dt__update__tmp_h0).dtor_adjustmentL);
    };
    static AdjustColorSL(c, newHue, deltaS, deltaL) {
      let _0_newS = ColorWheelSpec.__default.Clamp(((c).dtor_s).plus(deltaS), _dafny.ZERO, new BigNumber(100));
      let _1_newL = ColorWheelSpec.__default.Clamp(((c).dtor_l).plus(deltaL), _dafny.ZERO, new BigNumber(100));
      return ColorWheelSpec.Color.create_Color(newHue, _0_newS, _1_newL);
    };
    static ApplyIndependentAdjustment(m, index, deltaH, deltaS, deltaL) {
      let _0_oldColor = ((m).dtor_colors)[index];
      let _1_newColor = ColorWheelSpec.__default.ClampColor(ColorWheelSpec.Color.create_Color(((_0_oldColor).dtor_h).plus(deltaH), ((_0_oldColor).dtor_s).plus(deltaS), ((_0_oldColor).dtor_l).plus(deltaL)));
      let _2_expectedHues = ColorWheelSpec.__default.AllHarmonyHues((m).dtor_baseHue, (m).dtor_harmony);
      let _3_hueChanged = ((new BigNumber((_2_expectedHues).length)).isEqualTo(new BigNumber(5))) && (!((_1_newColor).dtor_h).isEqualTo((_2_expectedHues)[index]));
      let _4_harmonyBroken = (!_dafny.areEqual((m).dtor_harmony, ColorWheelSpec.Harmony.create_Custom())) && (_3_hueChanged);
      let _5_moodBroken = (!_dafny.areEqual((m).dtor_mood, ColorWheelSpec.Mood.create_Custom())) && (!(ColorWheelSpec.__default.ColorSatisfiesMood(_1_newColor, (m).dtor_mood)));
      let _6_newColors = _dafny.Seq.update((m).dtor_colors, index, _1_newColor);
      let _7_newHarmony = ((_4_harmonyBroken) ? (ColorWheelSpec.Harmony.create_Custom()) : ((m).dtor_harmony));
      let _8_newMood = ((_5_moodBroken) ? (ColorWheelSpec.Mood.create_Custom()) : ((m).dtor_mood));
      let _9_dt__update__tmp_h0 = m;
      let _10_dt__update_hmood_h0 = _8_newMood;
      let _11_dt__update_hharmony_h0 = _7_newHarmony;
      let _12_dt__update_hcolors_h0 = _6_newColors;
      return ColorWheelSpec.Model.create_Model((_9_dt__update__tmp_h0).dtor_baseHue, _10_dt__update_hmood_h0, _11_dt__update_hharmony_h0, _12_dt__update_hcolors_h0, (_9_dt__update__tmp_h0).dtor_contrastPair, (_9_dt__update__tmp_h0).dtor_adjustmentH, (_9_dt__update__tmp_h0).dtor_adjustmentS, (_9_dt__update__tmp_h0).dtor_adjustmentL);
    };
    static ApplySetColorDirect(m, index, color) {
      let _0_clampedColor = ColorWheelSpec.__default.ClampColor(color);
      let _1_expectedHues = ColorWheelSpec.__default.AllHarmonyHues((m).dtor_baseHue, (m).dtor_harmony);
      let _2_hueMatches = ((new BigNumber((_1_expectedHues).length)).isEqualTo(new BigNumber(5))) && (((_0_clampedColor).dtor_h).isEqualTo((_1_expectedHues)[index]));
      let _3_harmonyPreserved = (_dafny.areEqual((m).dtor_harmony, ColorWheelSpec.Harmony.create_Custom())) || (_2_hueMatches);
      let _4_moodPreserved = (_dafny.areEqual((m).dtor_mood, ColorWheelSpec.Mood.create_Custom())) || (ColorWheelSpec.__default.ColorSatisfiesMood(_0_clampedColor, (m).dtor_mood));
      let _5_newColors = _dafny.Seq.update((m).dtor_colors, index, _0_clampedColor);
      let _6_newHarmony = ((_3_harmonyPreserved) ? ((m).dtor_harmony) : (ColorWheelSpec.Harmony.create_Custom()));
      let _7_newMood = ((_4_moodPreserved) ? ((m).dtor_mood) : (ColorWheelSpec.Mood.create_Custom()));
      let _8_dt__update__tmp_h0 = m;
      let _9_dt__update_hmood_h0 = _7_newMood;
      let _10_dt__update_hharmony_h0 = _6_newHarmony;
      let _11_dt__update_hcolors_h0 = _5_newColors;
      return ColorWheelSpec.Model.create_Model((_8_dt__update__tmp_h0).dtor_baseHue, _9_dt__update_hmood_h0, _10_dt__update_hharmony_h0, _11_dt__update_hcolors_h0, (_8_dt__update__tmp_h0).dtor_contrastPair, (_8_dt__update__tmp_h0).dtor_adjustmentH, (_8_dt__update__tmp_h0).dtor_adjustmentS, (_8_dt__update__tmp_h0).dtor_adjustmentL);
    };
    static Normalize(m) {
      let _0_normalizedBaseHue = ColorWheelSpec.__default.NormalizeHue((m).dtor_baseHue);
      let _1_normalizedColors = (((new BigNumber(((m).dtor_colors).length)).isEqualTo(new BigNumber(5))) ? (_dafny.Seq.of(ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[_dafny.ZERO]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[_dafny.ONE]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[new BigNumber(2)]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[new BigNumber(3)]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[new BigNumber(4)]))) : (_dafny.Seq.of(ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO))));
      let _2_normalizedContrastPair = (((((_dafny.ZERO).isLessThanOrEqualTo(((m).dtor_contrastPair)[0])) && ((((m).dtor_contrastPair)[0]).isLessThan(new BigNumber(5)))) && (((_dafny.ZERO).isLessThanOrEqualTo(((m).dtor_contrastPair)[1])) && ((((m).dtor_contrastPair)[1]).isLessThan(new BigNumber(5))))) ? ((m).dtor_contrastPair) : (_dafny.Tuple.of(_dafny.ZERO, _dafny.ONE)));
      let _3_finalMood = ((_dafny.areEqual((m).dtor_mood, ColorWheelSpec.Mood.create_Custom())) ? (ColorWheelSpec.Mood.create_Custom()) : (((ColorWheelSpec.__default.AllColorsSatisfyMood(_1_normalizedColors, (m).dtor_mood)) ? ((m).dtor_mood) : (ColorWheelSpec.Mood.create_Custom()))));
      let _4_finalHarmony = ((_dafny.areEqual((m).dtor_harmony, ColorWheelSpec.Harmony.create_Custom())) ? (ColorWheelSpec.Harmony.create_Custom()) : (((ColorWheelSpec.__default.HuesMatchHarmony(_1_normalizedColors, _0_normalizedBaseHue, (m).dtor_harmony)) ? ((m).dtor_harmony) : (ColorWheelSpec.Harmony.create_Custom()))));
      let _5_dt__update__tmp_h0 = m;
      let _6_dt__update_hharmony_h0 = _4_finalHarmony;
      let _7_dt__update_hmood_h0 = _3_finalMood;
      let _8_dt__update_hcontrastPair_h0 = _2_normalizedContrastPair;
      let _9_dt__update_hcolors_h0 = _1_normalizedColors;
      let _10_dt__update_hbaseHue_h0 = _0_normalizedBaseHue;
      return ColorWheelSpec.Model.create_Model(_10_dt__update_hbaseHue_h0, _7_dt__update_hmood_h0, _6_dt__update_hharmony_h0, _9_dt__update_hcolors_h0, _8_dt__update_hcontrastPair_h0, (_5_dt__update__tmp_h0).dtor_adjustmentH, (_5_dt__update__tmp_h0).dtor_adjustmentS, (_5_dt__update__tmp_h0).dtor_adjustmentL);
    };
    static get GoldenOffset() {
      return new BigNumber(62);
    };
    static get HueSpread() {
      return new BigNumber(35);
    };
  };

  $module.Color = class Color {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Color(h, s, l) {
      let $dt = new Color(0);
      $dt.h = h;
      $dt.s = s;
      $dt.l = l;
      return $dt;
    }
    get is_Color() { return this.$tag === 0; }
    get dtor_h() { return this.h; }
    get dtor_s() { return this.s; }
    get dtor_l() { return this.l; }
    toString() {
      if (this.$tag === 0) {
        return "ColorWheelSpec.Color.Color" + "(" + _dafny.toString(this.h) + ", " + _dafny.toString(this.s) + ", " + _dafny.toString(this.l) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.h, other.h) && _dafny.areEqual(this.s, other.s) && _dafny.areEqual(this.l, other.l);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Color.Default();
        }
      };
    }
  }

  $module.Mood = class Mood {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Vibrant() {
      let $dt = new Mood(0);
      return $dt;
    }
    static create_SoftMuted() {
      let $dt = new Mood(1);
      return $dt;
    }
    static create_Pastel() {
      let $dt = new Mood(2);
      return $dt;
    }
    static create_DeepJewel() {
      let $dt = new Mood(3);
      return $dt;
    }
    static create_Earth() {
      let $dt = new Mood(4);
      return $dt;
    }
    static create_Neon() {
      let $dt = new Mood(5);
      return $dt;
    }
    static create_Custom() {
      let $dt = new Mood(6);
      return $dt;
    }
    get is_Vibrant() { return this.$tag === 0; }
    get is_SoftMuted() { return this.$tag === 1; }
    get is_Pastel() { return this.$tag === 2; }
    get is_DeepJewel() { return this.$tag === 3; }
    get is_Earth() { return this.$tag === 4; }
    get is_Neon() { return this.$tag === 5; }
    get is_Custom() { return this.$tag === 6; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Mood.create_Vibrant();
      yield Mood.create_SoftMuted();
      yield Mood.create_Pastel();
      yield Mood.create_DeepJewel();
      yield Mood.create_Earth();
      yield Mood.create_Neon();
      yield Mood.create_Custom();
    }
    toString() {
      if (this.$tag === 0) {
        return "ColorWheelSpec.Mood.Vibrant";
      } else if (this.$tag === 1) {
        return "ColorWheelSpec.Mood.SoftMuted";
      } else if (this.$tag === 2) {
        return "ColorWheelSpec.Mood.Pastel";
      } else if (this.$tag === 3) {
        return "ColorWheelSpec.Mood.DeepJewel";
      } else if (this.$tag === 4) {
        return "ColorWheelSpec.Mood.Earth";
      } else if (this.$tag === 5) {
        return "ColorWheelSpec.Mood.Neon";
      } else if (this.$tag === 6) {
        return "ColorWheelSpec.Mood.Custom";
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
      } else if (this.$tag === 2) {
        return other.$tag === 2;
      } else if (this.$tag === 3) {
        return other.$tag === 3;
      } else if (this.$tag === 4) {
        return other.$tag === 4;
      } else if (this.$tag === 5) {
        return other.$tag === 5;
      } else if (this.$tag === 6) {
        return other.$tag === 6;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ColorWheelSpec.Mood.create_Vibrant();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Mood.Default();
        }
      };
    }
  }

  $module.Harmony = class Harmony {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Complementary() {
      let $dt = new Harmony(0);
      return $dt;
    }
    static create_Triadic() {
      let $dt = new Harmony(1);
      return $dt;
    }
    static create_Analogous() {
      let $dt = new Harmony(2);
      return $dt;
    }
    static create_SplitComplement() {
      let $dt = new Harmony(3);
      return $dt;
    }
    static create_Square() {
      let $dt = new Harmony(4);
      return $dt;
    }
    static create_Custom() {
      let $dt = new Harmony(5);
      return $dt;
    }
    get is_Complementary() { return this.$tag === 0; }
    get is_Triadic() { return this.$tag === 1; }
    get is_Analogous() { return this.$tag === 2; }
    get is_SplitComplement() { return this.$tag === 3; }
    get is_Square() { return this.$tag === 4; }
    get is_Custom() { return this.$tag === 5; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Harmony.create_Complementary();
      yield Harmony.create_Triadic();
      yield Harmony.create_Analogous();
      yield Harmony.create_SplitComplement();
      yield Harmony.create_Square();
      yield Harmony.create_Custom();
    }
    toString() {
      if (this.$tag === 0) {
        return "ColorWheelSpec.Harmony.Complementary";
      } else if (this.$tag === 1) {
        return "ColorWheelSpec.Harmony.Triadic";
      } else if (this.$tag === 2) {
        return "ColorWheelSpec.Harmony.Analogous";
      } else if (this.$tag === 3) {
        return "ColorWheelSpec.Harmony.SplitComplement";
      } else if (this.$tag === 4) {
        return "ColorWheelSpec.Harmony.Square";
      } else if (this.$tag === 5) {
        return "ColorWheelSpec.Harmony.Custom";
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
      } else if (this.$tag === 2) {
        return other.$tag === 2;
      } else if (this.$tag === 3) {
        return other.$tag === 3;
      } else if (this.$tag === 4) {
        return other.$tag === 4;
      } else if (this.$tag === 5) {
        return other.$tag === 5;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ColorWheelSpec.Harmony.create_Complementary();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Harmony.Default();
        }
      };
    }
  }

  $module.Model = class Model {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Model(baseHue, mood, harmony, colors, contrastPair, adjustmentH, adjustmentS, adjustmentL) {
      let $dt = new Model(0);
      $dt.baseHue = baseHue;
      $dt.mood = mood;
      $dt.harmony = harmony;
      $dt.colors = colors;
      $dt.contrastPair = contrastPair;
      $dt.adjustmentH = adjustmentH;
      $dt.adjustmentS = adjustmentS;
      $dt.adjustmentL = adjustmentL;
      return $dt;
    }
    get is_Model() { return this.$tag === 0; }
    get dtor_baseHue() { return this.baseHue; }
    get dtor_mood() { return this.mood; }
    get dtor_harmony() { return this.harmony; }
    get dtor_colors() { return this.colors; }
    get dtor_contrastPair() { return this.contrastPair; }
    get dtor_adjustmentH() { return this.adjustmentH; }
    get dtor_adjustmentS() { return this.adjustmentS; }
    get dtor_adjustmentL() { return this.adjustmentL; }
    toString() {
      if (this.$tag === 0) {
        return "ColorWheelSpec.Model.Model" + "(" + _dafny.toString(this.baseHue) + ", " + _dafny.toString(this.mood) + ", " + _dafny.toString(this.harmony) + ", " + _dafny.toString(this.colors) + ", " + _dafny.toString(this.contrastPair) + ", " + _dafny.toString(this.adjustmentH) + ", " + _dafny.toString(this.adjustmentS) + ", " + _dafny.toString(this.adjustmentL) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.baseHue, other.baseHue) && _dafny.areEqual(this.mood, other.mood) && _dafny.areEqual(this.harmony, other.harmony) && _dafny.areEqual(this.colors, other.colors) && _dafny.areEqual(this.contrastPair, other.contrastPair) && _dafny.areEqual(this.adjustmentH, other.adjustmentH) && _dafny.areEqual(this.adjustmentS, other.adjustmentS) && _dafny.areEqual(this.adjustmentL, other.adjustmentL);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ColorWheelSpec.Model.create_Model(_dafny.ZERO, ColorWheelSpec.Mood.Default(), ColorWheelSpec.Harmony.Default(), _dafny.Seq.of(), _dafny.Tuple.Default(_dafny.ZERO, _dafny.ZERO), _dafny.ZERO, _dafny.ZERO, _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Model.Default();
        }
      };
    }
  }

  $module.Action = class Action {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_GeneratePalette(baseHue, mood, harmony, randomSeeds) {
      let $dt = new Action(0);
      $dt.baseHue = baseHue;
      $dt.mood = mood;
      $dt.harmony = harmony;
      $dt.randomSeeds = randomSeeds;
      return $dt;
    }
    static create_AdjustColor(index, deltaH, deltaS, deltaL) {
      let $dt = new Action(1);
      $dt.index = index;
      $dt.deltaH = deltaH;
      $dt.deltaS = deltaS;
      $dt.deltaL = deltaL;
      return $dt;
    }
    static create_AdjustPalette(deltaH, deltaS, deltaL) {
      let $dt = new Action(2);
      $dt.deltaH = deltaH;
      $dt.deltaS = deltaS;
      $dt.deltaL = deltaL;
      return $dt;
    }
    static create_SelectContrastPair(fg, bg) {
      let $dt = new Action(3);
      $dt.fg = fg;
      $dt.bg = bg;
      return $dt;
    }
    static create_SetColorDirect(index, color) {
      let $dt = new Action(4);
      $dt.index = index;
      $dt.color = color;
      return $dt;
    }
    static create_RegenerateMood(mood, randomSeeds) {
      let $dt = new Action(5);
      $dt.mood = mood;
      $dt.randomSeeds = randomSeeds;
      return $dt;
    }
    static create_RegenerateHarmony(harmony, randomSeeds) {
      let $dt = new Action(6);
      $dt.harmony = harmony;
      $dt.randomSeeds = randomSeeds;
      return $dt;
    }
    static create_RandomizeBaseHue(newBaseHue, randomSeeds) {
      let $dt = new Action(7);
      $dt.newBaseHue = newBaseHue;
      $dt.randomSeeds = randomSeeds;
      return $dt;
    }
    get is_GeneratePalette() { return this.$tag === 0; }
    get is_AdjustColor() { return this.$tag === 1; }
    get is_AdjustPalette() { return this.$tag === 2; }
    get is_SelectContrastPair() { return this.$tag === 3; }
    get is_SetColorDirect() { return this.$tag === 4; }
    get is_RegenerateMood() { return this.$tag === 5; }
    get is_RegenerateHarmony() { return this.$tag === 6; }
    get is_RandomizeBaseHue() { return this.$tag === 7; }
    get dtor_baseHue() { return this.baseHue; }
    get dtor_mood() { return this.mood; }
    get dtor_harmony() { return this.harmony; }
    get dtor_randomSeeds() { return this.randomSeeds; }
    get dtor_index() { return this.index; }
    get dtor_deltaH() { return this.deltaH; }
    get dtor_deltaS() { return this.deltaS; }
    get dtor_deltaL() { return this.deltaL; }
    get dtor_fg() { return this.fg; }
    get dtor_bg() { return this.bg; }
    get dtor_color() { return this.color; }
    get dtor_newBaseHue() { return this.newBaseHue; }
    toString() {
      if (this.$tag === 0) {
        return "ColorWheelSpec.Action.GeneratePalette" + "(" + _dafny.toString(this.baseHue) + ", " + _dafny.toString(this.mood) + ", " + _dafny.toString(this.harmony) + ", " + _dafny.toString(this.randomSeeds) + ")";
      } else if (this.$tag === 1) {
        return "ColorWheelSpec.Action.AdjustColor" + "(" + _dafny.toString(this.index) + ", " + _dafny.toString(this.deltaH) + ", " + _dafny.toString(this.deltaS) + ", " + _dafny.toString(this.deltaL) + ")";
      } else if (this.$tag === 2) {
        return "ColorWheelSpec.Action.AdjustPalette" + "(" + _dafny.toString(this.deltaH) + ", " + _dafny.toString(this.deltaS) + ", " + _dafny.toString(this.deltaL) + ")";
      } else if (this.$tag === 3) {
        return "ColorWheelSpec.Action.SelectContrastPair" + "(" + _dafny.toString(this.fg) + ", " + _dafny.toString(this.bg) + ")";
      } else if (this.$tag === 4) {
        return "ColorWheelSpec.Action.SetColorDirect" + "(" + _dafny.toString(this.index) + ", " + _dafny.toString(this.color) + ")";
      } else if (this.$tag === 5) {
        return "ColorWheelSpec.Action.RegenerateMood" + "(" + _dafny.toString(this.mood) + ", " + _dafny.toString(this.randomSeeds) + ")";
      } else if (this.$tag === 6) {
        return "ColorWheelSpec.Action.RegenerateHarmony" + "(" + _dafny.toString(this.harmony) + ", " + _dafny.toString(this.randomSeeds) + ")";
      } else if (this.$tag === 7) {
        return "ColorWheelSpec.Action.RandomizeBaseHue" + "(" + _dafny.toString(this.newBaseHue) + ", " + _dafny.toString(this.randomSeeds) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.baseHue, other.baseHue) && _dafny.areEqual(this.mood, other.mood) && _dafny.areEqual(this.harmony, other.harmony) && _dafny.areEqual(this.randomSeeds, other.randomSeeds);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.index, other.index) && _dafny.areEqual(this.deltaH, other.deltaH) && _dafny.areEqual(this.deltaS, other.deltaS) && _dafny.areEqual(this.deltaL, other.deltaL);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.deltaH, other.deltaH) && _dafny.areEqual(this.deltaS, other.deltaS) && _dafny.areEqual(this.deltaL, other.deltaL);
      } else if (this.$tag === 3) {
        return other.$tag === 3 && _dafny.areEqual(this.fg, other.fg) && _dafny.areEqual(this.bg, other.bg);
      } else if (this.$tag === 4) {
        return other.$tag === 4 && _dafny.areEqual(this.index, other.index) && _dafny.areEqual(this.color, other.color);
      } else if (this.$tag === 5) {
        return other.$tag === 5 && _dafny.areEqual(this.mood, other.mood) && _dafny.areEqual(this.randomSeeds, other.randomSeeds);
      } else if (this.$tag === 6) {
        return other.$tag === 6 && _dafny.areEqual(this.harmony, other.harmony) && _dafny.areEqual(this.randomSeeds, other.randomSeeds);
      } else if (this.$tag === 7) {
        return other.$tag === 7 && _dafny.areEqual(this.newBaseHue, other.newBaseHue) && _dafny.areEqual(this.randomSeeds, other.randomSeeds);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ColorWheelSpec.Action.create_GeneratePalette(_dafny.ZERO, ColorWheelSpec.Mood.Default(), ColorWheelSpec.Harmony.Default(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Action.Default();
        }
      };
    }
  }
  return $module;
})(); // end of module ColorWheelSpec
let ColorWheelProof = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ColorWheelProof._default";
    }
    _parentTraits() {
      return [];
    }
    static NormalizedColors(m) {
      if ((new BigNumber(((m).dtor_colors).length)).isEqualTo(new BigNumber(5))) {
        return _dafny.Seq.of(ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[_dafny.ZERO]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[_dafny.ONE]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[new BigNumber(2)]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[new BigNumber(3)]), ColorWheelSpec.__default.ClampColor(((m).dtor_colors)[new BigNumber(4)]));
      } else {
        return _dafny.Seq.of(ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO), ColorWheelSpec.Color.create_Color(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO));
      }
    };
  };
  return $module;
})(); // end of module ColorWheelProof
let ColorWheelDomain = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ColorWheelDomain._default";
    }
    _parentTraits() {
      return [];
    }
    static Init() {
      return ColorWheelSpec.__default.Init();
    };
    static Apply(m, a) {
      return ColorWheelSpec.__default.Apply(m, a);
    };
    static Normalize(m) {
      return ColorWheelSpec.__default.Normalize(m);
    };
  };
  return $module;
})(); // end of module ColorWheelDomain
let ColorWheelKernel = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ColorWheelKernel._default";
    }
    _parentTraits() {
      return [];
    }
    static Step(m, a) {
      return ColorWheelDomain.__default.Normalize(ColorWheelDomain.__default.Apply(m, a));
    };
    static InitHistory() {
      return ColorWheelKernel.History.create_History(_dafny.Seq.of(), ColorWheelDomain.__default.Init(), _dafny.Seq.of());
    };
    static Do(h, a) {
      return ColorWheelKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of((h).dtor_present)), ColorWheelKernel.__default.Step((h).dtor_present, a), _dafny.Seq.of());
    };
    static Preview(h, a) {
      return ColorWheelKernel.History.create_History((h).dtor_past, ColorWheelKernel.__default.Step((h).dtor_present, a), (h).dtor_future);
    };
    static CommitFrom(h, baseline) {
      return ColorWheelKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of(baseline)), (h).dtor_present, _dafny.Seq.of());
    };
    static Undo(h) {
      if ((new BigNumber(((h).dtor_past).length)).isEqualTo(_dafny.ZERO)) {
        return h;
      } else {
        let _0_i = (new BigNumber(((h).dtor_past).length)).minus(_dafny.ONE);
        return ColorWheelKernel.History.create_History(((h).dtor_past).slice(0, _0_i), ((h).dtor_past)[_0_i], _dafny.Seq.Concat(_dafny.Seq.of((h).dtor_present), (h).dtor_future));
      }
    };
    static Redo(h) {
      if ((new BigNumber(((h).dtor_future).length)).isEqualTo(_dafny.ZERO)) {
        return h;
      } else {
        return ColorWheelKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of((h).dtor_present)), ((h).dtor_future)[_dafny.ZERO], ((h).dtor_future).slice(_dafny.ONE));
      }
    };
  };

  $module.History = class History {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_History(past, present, future) {
      let $dt = new History(0);
      $dt.past = past;
      $dt.present = present;
      $dt.future = future;
      return $dt;
    }
    get is_History() { return this.$tag === 0; }
    get dtor_past() { return this.past; }
    get dtor_present() { return this.present; }
    get dtor_future() { return this.future; }
    toString() {
      if (this.$tag === 0) {
        return "ColorWheelKernel.History.History" + "(" + _dafny.toString(this.past) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.future) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.past, other.past) && _dafny.areEqual(this.present, other.present) && _dafny.areEqual(this.future, other.future);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ColorWheelKernel.History.create_History(_dafny.Seq.of(), ColorWheelSpec.Model.Default(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return History.Default();
        }
      };
    }
  }
  return $module;
})(); // end of module ColorWheelKernel
let AppCore = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "AppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static Init() {
      return ColorWheelKernel.__default.InitHistory();
    };
    static GeneratePalette(baseHue, mood, harmony, randomSeeds) {
      return ColorWheelSpec.Action.create_GeneratePalette(baseHue, mood, harmony, randomSeeds);
    };
    static AdjustColor(index, deltaH, deltaS, deltaL) {
      return ColorWheelSpec.Action.create_AdjustColor(index, deltaH, deltaS, deltaL);
    };
    static AdjustPalette(deltaH, deltaS, deltaL) {
      return ColorWheelSpec.Action.create_AdjustPalette(deltaH, deltaS, deltaL);
    };
    static SelectContrastPair(fg, bg) {
      return ColorWheelSpec.Action.create_SelectContrastPair(fg, bg);
    };
    static SetColorDirect(index, color) {
      return ColorWheelSpec.Action.create_SetColorDirect(index, color);
    };
    static RegenerateMood(mood, randomSeeds) {
      return ColorWheelSpec.Action.create_RegenerateMood(mood, randomSeeds);
    };
    static RegenerateHarmony(harmony, randomSeeds) {
      return ColorWheelSpec.Action.create_RegenerateHarmony(harmony, randomSeeds);
    };
    static RandomizeBaseHue(newBaseHue, randomSeeds) {
      return ColorWheelSpec.Action.create_RandomizeBaseHue(newBaseHue, randomSeeds);
    };
    static Dispatch(h, a) {
      return ColorWheelKernel.__default.Do(h, a);
    };
    static Preview(h, a) {
      return ColorWheelKernel.__default.Preview(h, a);
    };
    static CommitFrom(h, baseline) {
      return ColorWheelKernel.__default.CommitFrom(h, baseline);
    };
    static Undo(h) {
      return ColorWheelKernel.__default.Undo(h);
    };
    static Redo(h) {
      return ColorWheelKernel.__default.Redo(h);
    };
    static Present(h) {
      return (h).dtor_present;
    };
    static CanUndo(h) {
      return (_dafny.ZERO).isLessThan(new BigNumber(((h).dtor_past).length));
    };
    static CanRedo(h) {
      return (_dafny.ZERO).isLessThan(new BigNumber(((h).dtor_future).length));
    };
  };
  return $module;
})(); // end of module AppCore
let _module = (function() {
  let $module = {};

  return $module;
})(); // end of module _module
