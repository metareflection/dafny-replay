// Dafny program TodoEffectStateMachine.dfy compiled into JavaScript
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
let TodoDomain = (function() {
  let $module = {};

  $module.__default = class __default {
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
        return ((((m).dtor_tags).contains(_0_t)) && (((excludeTag).is_None) || (!(_0_t).isEqualTo((excludeTag).dtor_value)))) && (TodoDomain.__default.EqIgnoreCase((((m).dtor_tags).get(_0_t)), name));
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
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, ((m).dtor_tags).update(_81_id, _80_name), (m).dtor_nextListId, (m).dtor_nextTaskId, ((m).dtor_nextTagId).plus(_dafny.ONE)));
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
            return TodoDomain.Result.create_Ok(TodoDomain.Model.create_Model((m).dtor_mode, (m).dtor_owner, (m).dtor_members, (m).dtor_lists, (m).dtor_listNames, (m).dtor_tasks, (m).dtor_taskData, ((m).dtor_tags).update(_82_tagId, _83_newName), (m).dtor_nextListId, (m).dtor_nextTaskId, (m).dtor_nextTagId));
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
        return TodoDomain.Option.create_Some((((m).dtor_tags).get(tagId)));
      } else {
        return TodoDomain.Option.create_None();
      }
    };
    static GetTags(m) {
      return ((m).dtor_tags).Keys;
    };
    static EmptyMultiModel() {
      return _dafny.Map.Empty.slice();
    };
    static SetProject(mm, projectId, model) {
      return ((mm)).update(projectId, model);
    };
    static RemoveProject(mm, projectId) {
      return ((mm)).Subtract(_dafny.Set.fromElements(projectId));
    };
    static GetProject(mm, projectId) {
      if (((mm)).contains(projectId)) {
        return TodoDomain.Option.create_Some(((mm)).get(projectId));
      } else {
        return TodoDomain.Option.create_None();
      }
    };
    static GetProjectIds(mm) {
      return ((mm)).Keys;
    };
    static CountProjects(mm) {
      return new BigNumber(((mm)).length);
    };
    static GetAllPriorityTasks(mm) {
      return function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of ((mm)).Keys.Elements) {
          let _0_pid = _compr_0;
          if (((mm)).contains(_0_pid)) {
            for (const _compr_1 of (TodoDomain.__default.GetPriorityTaskIds(((mm)).get(_0_pid))).Elements) {
              let _1_tid = _compr_1;
              if (_System.nat._Is(_1_tid)) {
                if ((TodoDomain.__default.GetPriorityTaskIds(((mm)).get(_0_pid))).contains(_1_tid)) {
                  _coll0.add(TodoDomain.TaggedTaskId.create_TaggedTaskId(_0_pid, _1_tid));
                }
              }
            }
          }
        }
        return _coll0;
      }();
    };
    static GetAllLogbookTasks(mm) {
      return function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of ((mm)).Keys.Elements) {
          let _0_pid = _compr_0;
          if (((mm)).contains(_0_pid)) {
            for (const _compr_1 of (TodoDomain.__default.GetLogbookTaskIds(((mm)).get(_0_pid))).Elements) {
              let _1_tid = _compr_1;
              if (_System.nat._Is(_1_tid)) {
                if ((TodoDomain.__default.GetLogbookTaskIds(((mm)).get(_0_pid))).contains(_1_tid)) {
                  _coll0.add(TodoDomain.TaggedTaskId.create_TaggedTaskId(_0_pid, _1_tid));
                }
              }
            }
          }
        }
        return _coll0;
      }();
    };
    static GetAllSmartListTasks(mm, smartList) {
      let _source0 = smartList;
      {
        if (_source0.is_Priority) {
          return TodoDomain.__default.GetAllPriorityTasks(mm);
        }
      }
      {
        return TodoDomain.__default.GetAllLogbookTasks(mm);
      }
    };
    static CountAllPriorityTasks(mm) {
      return new BigNumber((TodoDomain.__default.GetAllPriorityTasks(mm)).length);
    };
    static CountAllLogbookTasks(mm) {
      return new BigNumber((TodoDomain.__default.GetAllLogbookTasks(mm)).length);
    };
    static CountAllSmartListTasks(mm, smartList) {
      return new BigNumber((TodoDomain.__default.GetAllSmartListTasks(mm, smartList)).length);
    };
    static InitViewState() {
      return TodoDomain.ViewState.create_ViewState(TodoDomain.ViewMode.create_AllProjects(), TodoDomain.SidebarSelection.create_NoSelection(), TodoDomain.__default.EmptyMultiModel());
    };
    static SetViewMode(vs, mode) {
      return TodoDomain.ViewState.create_ViewState(mode, (vs).dtor_selection, (vs).dtor_loadedProjects);
    };
    static SelectSmartList(vs, smartList) {
      return TodoDomain.ViewState.create_ViewState((vs).dtor_viewMode, TodoDomain.SidebarSelection.create_SmartListSelected(smartList), (vs).dtor_loadedProjects);
    };
    static SelectProject(vs, projectId) {
      return TodoDomain.ViewState.create_ViewState((vs).dtor_viewMode, TodoDomain.SidebarSelection.create_ProjectSelected(projectId), (vs).dtor_loadedProjects);
    };
    static SelectList(vs, projectId, listId) {
      return TodoDomain.ViewState.create_ViewState((vs).dtor_viewMode, TodoDomain.SidebarSelection.create_ListSelected(projectId, listId), (vs).dtor_loadedProjects);
    };
    static ClearSelection(vs) {
      return TodoDomain.ViewState.create_ViewState((vs).dtor_viewMode, TodoDomain.SidebarSelection.create_NoSelection(), (vs).dtor_loadedProjects);
    };
    static LoadProject(vs, projectId, model) {
      return TodoDomain.ViewState.create_ViewState((vs).dtor_viewMode, (vs).dtor_selection, TodoDomain.__default.SetProject((vs).dtor_loadedProjects, projectId, model));
    };
    static UnloadProject(vs, projectId) {
      return TodoDomain.ViewState.create_ViewState((vs).dtor_viewMode, (vs).dtor_selection, TodoDomain.__default.RemoveProject((vs).dtor_loadedProjects, projectId));
    };
    static GetTasksToDisplay(vs) {
      let _source0 = (vs).dtor_selection;
      {
        if (_source0.is_NoSelection) {
          return _dafny.Set.fromElements();
        }
      }
      {
        if (_source0.is_SmartListSelected) {
          let _0_smartList = (_source0).smartList;
          return TodoDomain.__default.GetAllSmartListTasks((vs).dtor_loadedProjects, _0_smartList);
        }
      }
      {
        if (_source0.is_ProjectSelected) {
          let _1_projectId = (_source0).projectId;
          if ((((vs).dtor_loadedProjects)).contains(_1_projectId)) {
            let _2_m = (((vs).dtor_loadedProjects)).get(_1_projectId);
            return function () {
              let _coll0 = new _dafny.Set();
              for (const _compr_0 of (TodoDomain.__default.GetVisibleTaskIds(_2_m)).Elements) {
                let _3_tid = _compr_0;
                if (_System.nat._Is(_3_tid)) {
                  if ((TodoDomain.__default.GetVisibleTaskIds(_2_m)).contains(_3_tid)) {
                    _coll0.add(TodoDomain.TaggedTaskId.create_TaggedTaskId(_1_projectId, _3_tid));
                  }
                }
              }
              return _coll0;
            }();
          } else {
            return _dafny.Set.fromElements();
          }
        }
      }
      {
        let _4_projectId = (_source0).projectId;
        let _5_listId = (_source0).listId;
        if ((((vs).dtor_loadedProjects)).contains(_4_projectId)) {
          let _6_m = (((vs).dtor_loadedProjects)).get(_4_projectId);
          return function () {
            let _coll1 = new _dafny.Set();
            if (((_6_m).dtor_tasks).contains(_5_listId)) {
              for (const _compr_1 of ((_6_m).dtor_taskData).Keys.Elements) {
                let _7_tid = _compr_1;
                if (_System.nat._Is(_7_tid)) {
                  if (((((_6_m).dtor_taskData).contains(_7_tid)) && (TodoDomain.__default.SeqContains(((_6_m).dtor_tasks).get(_5_listId), _7_tid))) && (TodoDomain.__default.IsVisibleTask(((_6_m).dtor_taskData).get(_7_tid)))) {
                    _coll1.add(TodoDomain.TaggedTaskId.create_TaggedTaskId(_4_projectId, _7_tid));
                  }
                }
              }
            }
            return _coll1;
          }();
        } else {
          return _dafny.Set.fromElements();
        }
      }
    };
    static GetSmartListCount(vs, smartList) {
      return TodoDomain.__default.CountAllSmartListTasks((vs).dtor_loadedProjects, smartList);
    };
    static IsProjectLoaded(vs, projectId) {
      return (((vs).dtor_loadedProjects)).contains(projectId);
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

  $module.Option = class Option {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_None() {
      let $dt = new Option(0);
      return $dt;
    }
    static create_Some(value) {
      let $dt = new Option(1);
      $dt.value = value;
      return $dt;
    }
    get is_None() { return this.$tag === 0; }
    get is_Some() { return this.$tag === 1; }
    get dtor_value() { return this.value; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.Option.None";
      } else if (this.$tag === 1) {
        return "TodoDomain.Option.Some" + "(" + _dafny.toString(this.value) + ")";
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
        return other.$tag === 1 && _dafny.areEqual(this.value, other.value);
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

  $module.Date = class Date {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Date(year, month, day) {
      let $dt = new Date(0);
      $dt.year = year;
      $dt.month = month;
      $dt.day = day;
      return $dt;
    }
    get is_Date() { return this.$tag === 0; }
    get dtor_year() { return this.year; }
    get dtor_month() { return this.month; }
    get dtor_day() { return this.day; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.Date.Date" + "(" + _dafny.toString(this.year) + ", " + _dafny.toString(this.month) + ", " + _dafny.toString(this.day) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.year, other.year) && _dafny.areEqual(this.month, other.month) && _dafny.areEqual(this.day, other.day);
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

  $module.Task = class Task {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Task(title, notes, completed, starred, dueDate, assignees, tags, deleted, deletedBy, deletedFromList) {
      let $dt = new Task(0);
      $dt.title = title;
      $dt.notes = notes;
      $dt.completed = completed;
      $dt.starred = starred;
      $dt.dueDate = dueDate;
      $dt.assignees = assignees;
      $dt.tags = tags;
      $dt.deleted = deleted;
      $dt.deletedBy = deletedBy;
      $dt.deletedFromList = deletedFromList;
      return $dt;
    }
    get is_Task() { return this.$tag === 0; }
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
      if (this.$tag === 0) {
        return "TodoDomain.Task.Task" + "(" + this.title.toVerbatimString(true) + ", " + this.notes.toVerbatimString(true) + ", " + _dafny.toString(this.completed) + ", " + _dafny.toString(this.starred) + ", " + _dafny.toString(this.dueDate) + ", " + _dafny.toString(this.assignees) + ", " + _dafny.toString(this.tags) + ", " + _dafny.toString(this.deleted) + ", " + _dafny.toString(this.deletedBy) + ", " + _dafny.toString(this.deletedFromList) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.title, other.title) && _dafny.areEqual(this.notes, other.notes) && this.completed === other.completed && this.starred === other.starred && _dafny.areEqual(this.dueDate, other.dueDate) && _dafny.areEqual(this.assignees, other.assignees) && _dafny.areEqual(this.tags, other.tags) && this.deleted === other.deleted && _dafny.areEqual(this.deletedBy, other.deletedBy) && _dafny.areEqual(this.deletedFromList, other.deletedFromList);
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

  $module.Tag = class Tag {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Tag(name) {
      let $dt = new Tag(0);
      $dt.name = name;
      return $dt;
    }
    get is_Tag() { return this.$tag === 0; }
    get dtor_name() { return this.name; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.Tag.Tag" + "(" + this.name.toVerbatimString(true) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.name, other.name);
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
          return Tag.Default();
        }
      };
    }
  }

  $module.ProjectMode = class ProjectMode {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Personal() {
      let $dt = new ProjectMode(0);
      return $dt;
    }
    static create_Collaborative() {
      let $dt = new ProjectMode(1);
      return $dt;
    }
    get is_Personal() { return this.$tag === 0; }
    get is_Collaborative() { return this.$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield ProjectMode.create_Personal();
      yield ProjectMode.create_Collaborative();
    }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.ProjectMode.Personal";
      } else if (this.$tag === 1) {
        return "TodoDomain.ProjectMode.Collaborative";
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

  $module.Model = class Model {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Model(mode, owner, members, lists, listNames, tasks, taskData, tags, nextListId, nextTaskId, nextTagId) {
      let $dt = new Model(0);
      $dt.mode = mode;
      $dt.owner = owner;
      $dt.members = members;
      $dt.lists = lists;
      $dt.listNames = listNames;
      $dt.tasks = tasks;
      $dt.taskData = taskData;
      $dt.tags = tags;
      $dt.nextListId = nextListId;
      $dt.nextTaskId = nextTaskId;
      $dt.nextTagId = nextTagId;
      return $dt;
    }
    get is_Model() { return this.$tag === 0; }
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
      if (this.$tag === 0) {
        return "TodoDomain.Model.Model" + "(" + _dafny.toString(this.mode) + ", " + this.owner.toVerbatimString(true) + ", " + _dafny.toString(this.members) + ", " + _dafny.toString(this.lists) + ", " + _dafny.toString(this.listNames) + ", " + _dafny.toString(this.tasks) + ", " + _dafny.toString(this.taskData) + ", " + _dafny.toString(this.tags) + ", " + _dafny.toString(this.nextListId) + ", " + _dafny.toString(this.nextTaskId) + ", " + _dafny.toString(this.nextTagId) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.mode, other.mode) && _dafny.areEqual(this.owner, other.owner) && _dafny.areEqual(this.members, other.members) && _dafny.areEqual(this.lists, other.lists) && _dafny.areEqual(this.listNames, other.listNames) && _dafny.areEqual(this.tasks, other.tasks) && _dafny.areEqual(this.taskData, other.taskData) && _dafny.areEqual(this.tags, other.tags) && _dafny.areEqual(this.nextListId, other.nextListId) && _dafny.areEqual(this.nextTaskId, other.nextTaskId) && _dafny.areEqual(this.nextTagId, other.nextTagId);
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

  $module.Err = class Err {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_MissingList() {
      let $dt = new Err(0);
      return $dt;
    }
    static create_MissingTask() {
      let $dt = new Err(1);
      return $dt;
    }
    static create_MissingTag() {
      let $dt = new Err(2);
      return $dt;
    }
    static create_MissingUser() {
      let $dt = new Err(3);
      return $dt;
    }
    static create_DuplicateList() {
      let $dt = new Err(4);
      return $dt;
    }
    static create_DuplicateTask() {
      let $dt = new Err(5);
      return $dt;
    }
    static create_DuplicateTag() {
      let $dt = new Err(6);
      return $dt;
    }
    static create_BadAnchor() {
      let $dt = new Err(7);
      return $dt;
    }
    static create_NotAMember() {
      let $dt = new Err(8);
      return $dt;
    }
    static create_PersonalProject() {
      let $dt = new Err(9);
      return $dt;
    }
    static create_AlreadyCollaborative() {
      let $dt = new Err(10);
      return $dt;
    }
    static create_CannotRemoveOwner() {
      let $dt = new Err(11);
      return $dt;
    }
    static create_TaskDeleted() {
      let $dt = new Err(12);
      return $dt;
    }
    static create_InvalidDate() {
      let $dt = new Err(13);
      return $dt;
    }
    static create_Rejected() {
      let $dt = new Err(14);
      return $dt;
    }
    get is_MissingList() { return this.$tag === 0; }
    get is_MissingTask() { return this.$tag === 1; }
    get is_MissingTag() { return this.$tag === 2; }
    get is_MissingUser() { return this.$tag === 3; }
    get is_DuplicateList() { return this.$tag === 4; }
    get is_DuplicateTask() { return this.$tag === 5; }
    get is_DuplicateTag() { return this.$tag === 6; }
    get is_BadAnchor() { return this.$tag === 7; }
    get is_NotAMember() { return this.$tag === 8; }
    get is_PersonalProject() { return this.$tag === 9; }
    get is_AlreadyCollaborative() { return this.$tag === 10; }
    get is_CannotRemoveOwner() { return this.$tag === 11; }
    get is_TaskDeleted() { return this.$tag === 12; }
    get is_InvalidDate() { return this.$tag === 13; }
    get is_Rejected() { return this.$tag === 14; }
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
      if (this.$tag === 0) {
        return "TodoDomain.Err.MissingList";
      } else if (this.$tag === 1) {
        return "TodoDomain.Err.MissingTask";
      } else if (this.$tag === 2) {
        return "TodoDomain.Err.MissingTag";
      } else if (this.$tag === 3) {
        return "TodoDomain.Err.MissingUser";
      } else if (this.$tag === 4) {
        return "TodoDomain.Err.DuplicateList";
      } else if (this.$tag === 5) {
        return "TodoDomain.Err.DuplicateTask";
      } else if (this.$tag === 6) {
        return "TodoDomain.Err.DuplicateTag";
      } else if (this.$tag === 7) {
        return "TodoDomain.Err.BadAnchor";
      } else if (this.$tag === 8) {
        return "TodoDomain.Err.NotAMember";
      } else if (this.$tag === 9) {
        return "TodoDomain.Err.PersonalProject";
      } else if (this.$tag === 10) {
        return "TodoDomain.Err.AlreadyCollaborative";
      } else if (this.$tag === 11) {
        return "TodoDomain.Err.CannotRemoveOwner";
      } else if (this.$tag === 12) {
        return "TodoDomain.Err.TaskDeleted";
      } else if (this.$tag === 13) {
        return "TodoDomain.Err.InvalidDate";
      } else if (this.$tag === 14) {
        return "TodoDomain.Err.Rejected";
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
      } else if (this.$tag === 7) {
        return other.$tag === 7;
      } else if (this.$tag === 8) {
        return other.$tag === 8;
      } else if (this.$tag === 9) {
        return other.$tag === 9;
      } else if (this.$tag === 10) {
        return other.$tag === 10;
      } else if (this.$tag === 11) {
        return other.$tag === 11;
      } else if (this.$tag === 12) {
        return other.$tag === 12;
      } else if (this.$tag === 13) {
        return other.$tag === 13;
      } else if (this.$tag === 14) {
        return other.$tag === 14;
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

  $module.Place = class Place {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_AtEnd() {
      let $dt = new Place(0);
      return $dt;
    }
    static create_Before(anchor) {
      let $dt = new Place(1);
      $dt.anchor = anchor;
      return $dt;
    }
    static create_After(anchor) {
      let $dt = new Place(2);
      $dt.anchor = anchor;
      return $dt;
    }
    get is_AtEnd() { return this.$tag === 0; }
    get is_Before() { return this.$tag === 1; }
    get is_After() { return this.$tag === 2; }
    get dtor_anchor() { return this.anchor; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.Place.AtEnd";
      } else if (this.$tag === 1) {
        return "TodoDomain.Place.Before" + "(" + _dafny.toString(this.anchor) + ")";
      } else if (this.$tag === 2) {
        return "TodoDomain.Place.After" + "(" + _dafny.toString(this.anchor) + ")";
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
        return other.$tag === 1 && _dafny.areEqual(this.anchor, other.anchor);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.anchor, other.anchor);
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

  $module.ListPlace = class ListPlace {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_ListAtEnd() {
      let $dt = new ListPlace(0);
      return $dt;
    }
    static create_ListBefore(anchor) {
      let $dt = new ListPlace(1);
      $dt.anchor = anchor;
      return $dt;
    }
    static create_ListAfter(anchor) {
      let $dt = new ListPlace(2);
      $dt.anchor = anchor;
      return $dt;
    }
    get is_ListAtEnd() { return this.$tag === 0; }
    get is_ListBefore() { return this.$tag === 1; }
    get is_ListAfter() { return this.$tag === 2; }
    get dtor_anchor() { return this.anchor; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.ListPlace.ListAtEnd";
      } else if (this.$tag === 1) {
        return "TodoDomain.ListPlace.ListBefore" + "(" + _dafny.toString(this.anchor) + ")";
      } else if (this.$tag === 2) {
        return "TodoDomain.ListPlace.ListAfter" + "(" + _dafny.toString(this.anchor) + ")";
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
        return other.$tag === 1 && _dafny.areEqual(this.anchor, other.anchor);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.anchor, other.anchor);
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

  $module.Action = class Action {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_NoOp() {
      let $dt = new Action(0);
      return $dt;
    }
    static create_AddList(name) {
      let $dt = new Action(1);
      $dt.name = name;
      return $dt;
    }
    static create_RenameList(listId, newName) {
      let $dt = new Action(2);
      $dt.listId = listId;
      $dt.newName = newName;
      return $dt;
    }
    static create_DeleteList(listId) {
      let $dt = new Action(3);
      $dt.listId = listId;
      return $dt;
    }
    static create_MoveList(listId, listPlace) {
      let $dt = new Action(4);
      $dt.listId = listId;
      $dt.listPlace = listPlace;
      return $dt;
    }
    static create_AddTask(listId, title) {
      let $dt = new Action(5);
      $dt.listId = listId;
      $dt.title = title;
      return $dt;
    }
    static create_EditTask(taskId, title, notes) {
      let $dt = new Action(6);
      $dt.taskId = taskId;
      $dt.title = title;
      $dt.notes = notes;
      return $dt;
    }
    static create_DeleteTask(taskId, userId) {
      let $dt = new Action(7);
      $dt.taskId = taskId;
      $dt.userId = userId;
      return $dt;
    }
    static create_RestoreTask(taskId) {
      let $dt = new Action(8);
      $dt.taskId = taskId;
      return $dt;
    }
    static create_MoveTask(taskId, toList, taskPlace) {
      let $dt = new Action(9);
      $dt.taskId = taskId;
      $dt.toList = toList;
      $dt.taskPlace = taskPlace;
      return $dt;
    }
    static create_CompleteTask(taskId) {
      let $dt = new Action(10);
      $dt.taskId = taskId;
      return $dt;
    }
    static create_UncompleteTask(taskId) {
      let $dt = new Action(11);
      $dt.taskId = taskId;
      return $dt;
    }
    static create_StarTask(taskId) {
      let $dt = new Action(12);
      $dt.taskId = taskId;
      return $dt;
    }
    static create_UnstarTask(taskId) {
      let $dt = new Action(13);
      $dt.taskId = taskId;
      return $dt;
    }
    static create_SetDueDate(taskId, dueDate) {
      let $dt = new Action(14);
      $dt.taskId = taskId;
      $dt.dueDate = dueDate;
      return $dt;
    }
    static create_AssignTask(taskId, userId) {
      let $dt = new Action(15);
      $dt.taskId = taskId;
      $dt.userId = userId;
      return $dt;
    }
    static create_UnassignTask(taskId, userId) {
      let $dt = new Action(16);
      $dt.taskId = taskId;
      $dt.userId = userId;
      return $dt;
    }
    static create_AddTagToTask(taskId, tagId) {
      let $dt = new Action(17);
      $dt.taskId = taskId;
      $dt.tagId = tagId;
      return $dt;
    }
    static create_RemoveTagFromTask(taskId, tagId) {
      let $dt = new Action(18);
      $dt.taskId = taskId;
      $dt.tagId = tagId;
      return $dt;
    }
    static create_CreateTag(name) {
      let $dt = new Action(19);
      $dt.name = name;
      return $dt;
    }
    static create_RenameTag(tagId, newName) {
      let $dt = new Action(20);
      $dt.tagId = tagId;
      $dt.newName = newName;
      return $dt;
    }
    static create_DeleteTag(tagId) {
      let $dt = new Action(21);
      $dt.tagId = tagId;
      return $dt;
    }
    static create_MakeCollaborative() {
      let $dt = new Action(22);
      return $dt;
    }
    static create_AddMember(userId) {
      let $dt = new Action(23);
      $dt.userId = userId;
      return $dt;
    }
    static create_RemoveMember(userId) {
      let $dt = new Action(24);
      $dt.userId = userId;
      return $dt;
    }
    get is_NoOp() { return this.$tag === 0; }
    get is_AddList() { return this.$tag === 1; }
    get is_RenameList() { return this.$tag === 2; }
    get is_DeleteList() { return this.$tag === 3; }
    get is_MoveList() { return this.$tag === 4; }
    get is_AddTask() { return this.$tag === 5; }
    get is_EditTask() { return this.$tag === 6; }
    get is_DeleteTask() { return this.$tag === 7; }
    get is_RestoreTask() { return this.$tag === 8; }
    get is_MoveTask() { return this.$tag === 9; }
    get is_CompleteTask() { return this.$tag === 10; }
    get is_UncompleteTask() { return this.$tag === 11; }
    get is_StarTask() { return this.$tag === 12; }
    get is_UnstarTask() { return this.$tag === 13; }
    get is_SetDueDate() { return this.$tag === 14; }
    get is_AssignTask() { return this.$tag === 15; }
    get is_UnassignTask() { return this.$tag === 16; }
    get is_AddTagToTask() { return this.$tag === 17; }
    get is_RemoveTagFromTask() { return this.$tag === 18; }
    get is_CreateTag() { return this.$tag === 19; }
    get is_RenameTag() { return this.$tag === 20; }
    get is_DeleteTag() { return this.$tag === 21; }
    get is_MakeCollaborative() { return this.$tag === 22; }
    get is_AddMember() { return this.$tag === 23; }
    get is_RemoveMember() { return this.$tag === 24; }
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
      if (this.$tag === 0) {
        return "TodoDomain.Action.NoOp";
      } else if (this.$tag === 1) {
        return "TodoDomain.Action.AddList" + "(" + this.name.toVerbatimString(true) + ")";
      } else if (this.$tag === 2) {
        return "TodoDomain.Action.RenameList" + "(" + _dafny.toString(this.listId) + ", " + this.newName.toVerbatimString(true) + ")";
      } else if (this.$tag === 3) {
        return "TodoDomain.Action.DeleteList" + "(" + _dafny.toString(this.listId) + ")";
      } else if (this.$tag === 4) {
        return "TodoDomain.Action.MoveList" + "(" + _dafny.toString(this.listId) + ", " + _dafny.toString(this.listPlace) + ")";
      } else if (this.$tag === 5) {
        return "TodoDomain.Action.AddTask" + "(" + _dafny.toString(this.listId) + ", " + this.title.toVerbatimString(true) + ")";
      } else if (this.$tag === 6) {
        return "TodoDomain.Action.EditTask" + "(" + _dafny.toString(this.taskId) + ", " + this.title.toVerbatimString(true) + ", " + this.notes.toVerbatimString(true) + ")";
      } else if (this.$tag === 7) {
        return "TodoDomain.Action.DeleteTask" + "(" + _dafny.toString(this.taskId) + ", " + this.userId.toVerbatimString(true) + ")";
      } else if (this.$tag === 8) {
        return "TodoDomain.Action.RestoreTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.$tag === 9) {
        return "TodoDomain.Action.MoveTask" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.toList) + ", " + _dafny.toString(this.taskPlace) + ")";
      } else if (this.$tag === 10) {
        return "TodoDomain.Action.CompleteTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.$tag === 11) {
        return "TodoDomain.Action.UncompleteTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.$tag === 12) {
        return "TodoDomain.Action.StarTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.$tag === 13) {
        return "TodoDomain.Action.UnstarTask" + "(" + _dafny.toString(this.taskId) + ")";
      } else if (this.$tag === 14) {
        return "TodoDomain.Action.SetDueDate" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.dueDate) + ")";
      } else if (this.$tag === 15) {
        return "TodoDomain.Action.AssignTask" + "(" + _dafny.toString(this.taskId) + ", " + this.userId.toVerbatimString(true) + ")";
      } else if (this.$tag === 16) {
        return "TodoDomain.Action.UnassignTask" + "(" + _dafny.toString(this.taskId) + ", " + this.userId.toVerbatimString(true) + ")";
      } else if (this.$tag === 17) {
        return "TodoDomain.Action.AddTagToTask" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.tagId) + ")";
      } else if (this.$tag === 18) {
        return "TodoDomain.Action.RemoveTagFromTask" + "(" + _dafny.toString(this.taskId) + ", " + _dafny.toString(this.tagId) + ")";
      } else if (this.$tag === 19) {
        return "TodoDomain.Action.CreateTag" + "(" + this.name.toVerbatimString(true) + ")";
      } else if (this.$tag === 20) {
        return "TodoDomain.Action.RenameTag" + "(" + _dafny.toString(this.tagId) + ", " + this.newName.toVerbatimString(true) + ")";
      } else if (this.$tag === 21) {
        return "TodoDomain.Action.DeleteTag" + "(" + _dafny.toString(this.tagId) + ")";
      } else if (this.$tag === 22) {
        return "TodoDomain.Action.MakeCollaborative";
      } else if (this.$tag === 23) {
        return "TodoDomain.Action.AddMember" + "(" + this.userId.toVerbatimString(true) + ")";
      } else if (this.$tag === 24) {
        return "TodoDomain.Action.RemoveMember" + "(" + this.userId.toVerbatimString(true) + ")";
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
        return other.$tag === 1 && _dafny.areEqual(this.name, other.name);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.listId, other.listId) && _dafny.areEqual(this.newName, other.newName);
      } else if (this.$tag === 3) {
        return other.$tag === 3 && _dafny.areEqual(this.listId, other.listId);
      } else if (this.$tag === 4) {
        return other.$tag === 4 && _dafny.areEqual(this.listId, other.listId) && _dafny.areEqual(this.listPlace, other.listPlace);
      } else if (this.$tag === 5) {
        return other.$tag === 5 && _dafny.areEqual(this.listId, other.listId) && _dafny.areEqual(this.title, other.title);
      } else if (this.$tag === 6) {
        return other.$tag === 6 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.title, other.title) && _dafny.areEqual(this.notes, other.notes);
      } else if (this.$tag === 7) {
        return other.$tag === 7 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.userId, other.userId);
      } else if (this.$tag === 8) {
        return other.$tag === 8 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.$tag === 9) {
        return other.$tag === 9 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.toList, other.toList) && _dafny.areEqual(this.taskPlace, other.taskPlace);
      } else if (this.$tag === 10) {
        return other.$tag === 10 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.$tag === 11) {
        return other.$tag === 11 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.$tag === 12) {
        return other.$tag === 12 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.$tag === 13) {
        return other.$tag === 13 && _dafny.areEqual(this.taskId, other.taskId);
      } else if (this.$tag === 14) {
        return other.$tag === 14 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.dueDate, other.dueDate);
      } else if (this.$tag === 15) {
        return other.$tag === 15 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.userId, other.userId);
      } else if (this.$tag === 16) {
        return other.$tag === 16 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.userId, other.userId);
      } else if (this.$tag === 17) {
        return other.$tag === 17 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.tagId, other.tagId);
      } else if (this.$tag === 18) {
        return other.$tag === 18 && _dafny.areEqual(this.taskId, other.taskId) && _dafny.areEqual(this.tagId, other.tagId);
      } else if (this.$tag === 19) {
        return other.$tag === 19 && _dafny.areEqual(this.name, other.name);
      } else if (this.$tag === 20) {
        return other.$tag === 20 && _dafny.areEqual(this.tagId, other.tagId) && _dafny.areEqual(this.newName, other.newName);
      } else if (this.$tag === 21) {
        return other.$tag === 21 && _dafny.areEqual(this.tagId, other.tagId);
      } else if (this.$tag === 22) {
        return other.$tag === 22;
      } else if (this.$tag === 23) {
        return other.$tag === 23 && _dafny.areEqual(this.userId, other.userId);
      } else if (this.$tag === 24) {
        return other.$tag === 24 && _dafny.areEqual(this.userId, other.userId);
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

  $module.ViewMode = class ViewMode {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_SingleProject() {
      let $dt = new ViewMode(0);
      return $dt;
    }
    static create_AllProjects() {
      let $dt = new ViewMode(1);
      return $dt;
    }
    get is_SingleProject() { return this.$tag === 0; }
    get is_AllProjects() { return this.$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield ViewMode.create_SingleProject();
      yield ViewMode.create_AllProjects();
    }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.ViewMode.SingleProject";
      } else if (this.$tag === 1) {
        return "TodoDomain.ViewMode.AllProjects";
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

  $module.SmartListType = class SmartListType {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Priority() {
      let $dt = new SmartListType(0);
      return $dt;
    }
    static create_Logbook() {
      let $dt = new SmartListType(1);
      return $dt;
    }
    get is_Priority() { return this.$tag === 0; }
    get is_Logbook() { return this.$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield SmartListType.create_Priority();
      yield SmartListType.create_Logbook();
    }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.SmartListType.Priority";
      } else if (this.$tag === 1) {
        return "TodoDomain.SmartListType.Logbook";
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

  $module.MultiModel = class MultiModel {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_MultiModel(projects) {
      let $dt = new MultiModel(0);
      $dt.projects = projects;
      return $dt;
    }
    get is_MultiModel() { return this.$tag === 0; }
    get dtor_projects() { return this.projects; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.MultiModel.MultiModel" + "(" + _dafny.toString(this.projects) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.projects, other.projects);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return _dafny.Map.Empty;
    }
    static Rtd() {
      return class {
        static get Default() {
          return MultiModel.Default();
        }
      };
    }
  }

  $module.TaggedTaskId = class TaggedTaskId {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_TaggedTaskId(projectId, taskId) {
      let $dt = new TaggedTaskId(0);
      $dt.projectId = projectId;
      $dt.taskId = taskId;
      return $dt;
    }
    get is_TaggedTaskId() { return this.$tag === 0; }
    get dtor_projectId() { return this.projectId; }
    get dtor_taskId() { return this.taskId; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.TaggedTaskId.TaggedTaskId" + "(" + this.projectId.toVerbatimString(true) + ", " + _dafny.toString(this.taskId) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.projectId, other.projectId) && _dafny.areEqual(this.taskId, other.taskId);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.TaggedTaskId.create_TaggedTaskId(_dafny.Seq.UnicodeFromString(""), _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return TaggedTaskId.Default();
        }
      };
    }
  }

  $module.SidebarSelection = class SidebarSelection {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_NoSelection() {
      let $dt = new SidebarSelection(0);
      return $dt;
    }
    static create_SmartListSelected(smartList) {
      let $dt = new SidebarSelection(1);
      $dt.smartList = smartList;
      return $dt;
    }
    static create_ProjectSelected(projectId) {
      let $dt = new SidebarSelection(2);
      $dt.projectId = projectId;
      return $dt;
    }
    static create_ListSelected(projectId, listId) {
      let $dt = new SidebarSelection(3);
      $dt.projectId = projectId;
      $dt.listId = listId;
      return $dt;
    }
    get is_NoSelection() { return this.$tag === 0; }
    get is_SmartListSelected() { return this.$tag === 1; }
    get is_ProjectSelected() { return this.$tag === 2; }
    get is_ListSelected() { return this.$tag === 3; }
    get dtor_smartList() { return this.smartList; }
    get dtor_projectId() { return this.projectId; }
    get dtor_listId() { return this.listId; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.SidebarSelection.NoSelection";
      } else if (this.$tag === 1) {
        return "TodoDomain.SidebarSelection.SmartListSelected" + "(" + _dafny.toString(this.smartList) + ")";
      } else if (this.$tag === 2) {
        return "TodoDomain.SidebarSelection.ProjectSelected" + "(" + this.projectId.toVerbatimString(true) + ")";
      } else if (this.$tag === 3) {
        return "TodoDomain.SidebarSelection.ListSelected" + "(" + this.projectId.toVerbatimString(true) + ", " + _dafny.toString(this.listId) + ")";
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
        return other.$tag === 1 && _dafny.areEqual(this.smartList, other.smartList);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.projectId, other.projectId);
      } else if (this.$tag === 3) {
        return other.$tag === 3 && _dafny.areEqual(this.projectId, other.projectId) && _dafny.areEqual(this.listId, other.listId);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.SidebarSelection.create_NoSelection();
    }
    static Rtd() {
      return class {
        static get Default() {
          return SidebarSelection.Default();
        }
      };
    }
  }

  $module.ViewState = class ViewState {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_ViewState(viewMode, selection, loadedProjects) {
      let $dt = new ViewState(0);
      $dt.viewMode = viewMode;
      $dt.selection = selection;
      $dt.loadedProjects = loadedProjects;
      return $dt;
    }
    get is_ViewState() { return this.$tag === 0; }
    get dtor_viewMode() { return this.viewMode; }
    get dtor_selection() { return this.selection; }
    get dtor_loadedProjects() { return this.loadedProjects; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.ViewState.ViewState" + "(" + _dafny.toString(this.viewMode) + ", " + _dafny.toString(this.selection) + ", " + _dafny.toString(this.loadedProjects) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.viewMode, other.viewMode) && _dafny.areEqual(this.selection, other.selection) && _dafny.areEqual(this.loadedProjects, other.loadedProjects);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoDomain.ViewState.create_ViewState(TodoDomain.ViewMode.Default(), TodoDomain.SidebarSelection.Default(), _dafny.Map.Empty);
    }
    static Rtd() {
      return class {
        static get Default() {
          return ViewState.Default();
        }
      };
    }
  }

  $module.Result = class Result {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Ok(value) {
      let $dt = new Result(0);
      $dt.value = value;
      return $dt;
    }
    static create_Err(error) {
      let $dt = new Result(1);
      $dt.error = error;
      return $dt;
    }
    get is_Ok() { return this.$tag === 0; }
    get is_Err() { return this.$tag === 1; }
    get dtor_value() { return this.value; }
    get dtor_error() { return this.error; }
    toString() {
      if (this.$tag === 0) {
        return "TodoDomain.Result.Ok" + "(" + _dafny.toString(this.value) + ")";
      } else if (this.$tag === 1) {
        return "TodoDomain.Result.Err" + "(" + _dafny.toString(this.error) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.value, other.value);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.error, other.error);
      } else  {
        return false; // unexpected
      }
    }
    static Default(_default_T) {
      return TodoDomain.Result.create_Ok(_default_T);
    }
    static Rtd(rtd$_T) {
      return class {
        static get Default() {
          return Result.Default(rtd$_T.Default);
        }
      };
    }
  }
  return $module;
})(); // end of module TodoDomain
let TodoMultiCollaboration = (function() {
  let $module = {};

  $module.__default = class __default {
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

  $module.RejectReason = class RejectReason {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_DomainInvalid() {
      let $dt = new RejectReason(0);
      return $dt;
    }
    get is_DomainInvalid() { return this.$tag === 0; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield RejectReason.create_DomainInvalid();
    }
    toString() {
      if (this.$tag === 0) {
        return "TodoMultiCollaboration.RejectReason.DomainInvalid";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0;
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

  $module.Reply = class Reply {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Accepted(newVersion, newPresent, applied, noChange) {
      let $dt = new Reply(0);
      $dt.newVersion = newVersion;
      $dt.newPresent = newPresent;
      $dt.applied = applied;
      $dt.noChange = noChange;
      return $dt;
    }
    static create_Rejected(reason, rebased) {
      let $dt = new Reply(1);
      $dt.reason = reason;
      $dt.rebased = rebased;
      return $dt;
    }
    get is_Accepted() { return this.$tag === 0; }
    get is_Rejected() { return this.$tag === 1; }
    get dtor_newVersion() { return this.newVersion; }
    get dtor_newPresent() { return this.newPresent; }
    get dtor_applied() { return this.applied; }
    get dtor_noChange() { return this.noChange; }
    get dtor_reason() { return this.reason; }
    get dtor_rebased() { return this.rebased; }
    toString() {
      if (this.$tag === 0) {
        return "TodoMultiCollaboration.Reply.Accepted" + "(" + _dafny.toString(this.newVersion) + ", " + _dafny.toString(this.newPresent) + ", " + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.$tag === 1) {
        return "TodoMultiCollaboration.Reply.Rejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.newVersion, other.newVersion) && _dafny.areEqual(this.newPresent, other.newPresent) && _dafny.areEqual(this.applied, other.applied) && this.noChange === other.noChange;
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.reason, other.reason) && _dafny.areEqual(this.rebased, other.rebased);
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

  $module.RequestOutcome = class RequestOutcome {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_AuditAccepted(applied, noChange) {
      let $dt = new RequestOutcome(0);
      $dt.applied = applied;
      $dt.noChange = noChange;
      return $dt;
    }
    static create_AuditRejected(reason, rebased) {
      let $dt = new RequestOutcome(1);
      $dt.reason = reason;
      $dt.rebased = rebased;
      return $dt;
    }
    get is_AuditAccepted() { return this.$tag === 0; }
    get is_AuditRejected() { return this.$tag === 1; }
    get dtor_applied() { return this.applied; }
    get dtor_noChange() { return this.noChange; }
    get dtor_reason() { return this.reason; }
    get dtor_rebased() { return this.rebased; }
    toString() {
      if (this.$tag === 0) {
        return "TodoMultiCollaboration.RequestOutcome.AuditAccepted" + "(" + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.$tag === 1) {
        return "TodoMultiCollaboration.RequestOutcome.AuditRejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.applied, other.applied) && this.noChange === other.noChange;
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.reason, other.reason) && _dafny.areEqual(this.rebased, other.rebased);
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

  $module.RequestRecord = class RequestRecord {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Req(baseVersion, orig, rebased, chosen, outcome) {
      let $dt = new RequestRecord(0);
      $dt.baseVersion = baseVersion;
      $dt.orig = orig;
      $dt.rebased = rebased;
      $dt.chosen = chosen;
      $dt.outcome = outcome;
      return $dt;
    }
    get is_Req() { return this.$tag === 0; }
    get dtor_baseVersion() { return this.baseVersion; }
    get dtor_orig() { return this.orig; }
    get dtor_rebased() { return this.rebased; }
    get dtor_chosen() { return this.chosen; }
    get dtor_outcome() { return this.outcome; }
    toString() {
      if (this.$tag === 0) {
        return "TodoMultiCollaboration.RequestRecord.Req" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.orig) + ", " + _dafny.toString(this.rebased) + ", " + _dafny.toString(this.chosen) + ", " + _dafny.toString(this.outcome) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.baseVersion, other.baseVersion) && _dafny.areEqual(this.orig, other.orig) && _dafny.areEqual(this.rebased, other.rebased) && _dafny.areEqual(this.chosen, other.chosen) && _dafny.areEqual(this.outcome, other.outcome);
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

  $module.ServerState = class ServerState {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_ServerState(present, appliedLog, auditLog) {
      let $dt = new ServerState(0);
      $dt.present = present;
      $dt.appliedLog = appliedLog;
      $dt.auditLog = auditLog;
      return $dt;
    }
    get is_ServerState() { return this.$tag === 0; }
    get dtor_present() { return this.present; }
    get dtor_appliedLog() { return this.appliedLog; }
    get dtor_auditLog() { return this.auditLog; }
    toString() {
      if (this.$tag === 0) {
        return "TodoMultiCollaboration.ServerState.ServerState" + "(" + _dafny.toString(this.present) + ", " + _dafny.toString(this.appliedLog) + ", " + _dafny.toString(this.auditLog) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.present, other.present) && _dafny.areEqual(this.appliedLog, other.appliedLog) && _dafny.areEqual(this.auditLog, other.auditLog);
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

  $module.ClientState = class ClientState {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_ClientState(baseVersion, present, pending) {
      let $dt = new ClientState(0);
      $dt.baseVersion = baseVersion;
      $dt.present = present;
      $dt.pending = pending;
      return $dt;
    }
    get is_ClientState() { return this.$tag === 0; }
    get dtor_baseVersion() { return this.baseVersion; }
    get dtor_present() { return this.present; }
    get dtor_pending() { return this.pending; }
    toString() {
      if (this.$tag === 0) {
        return "TodoMultiCollaboration.ClientState.ClientState" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.pending) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.baseVersion, other.baseVersion) && _dafny.areEqual(this.present, other.present) && _dafny.areEqual(this.pending, other.pending);
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
  return $module;
})(); // end of module TodoMultiCollaboration
let TodoEffectStateMachine = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "TodoEffectStateMachine._default";
    }
    _parentTraits() {
      return [];
    }
    static PendingCount(es) {
      return TodoMultiCollaboration.__default.PendingCount((es).dtor_client);
    };
    static HasPending(es) {
      return (_dafny.ZERO).isLessThan(TodoEffectStateMachine.__default.PendingCount(es));
    };
    static IsOnline(es) {
      return _dafny.areEqual((es).dtor_network, TodoEffectStateMachine.NetworkStatus.create_Online());
    };
    static IsIdle(es) {
      return _dafny.areEqual((es).dtor_mode, TodoEffectStateMachine.EffectMode.create_Idle());
    };
    static CanStartDispatch(es) {
      return ((TodoEffectStateMachine.__default.IsOnline(es)) && (TodoEffectStateMachine.__default.IsIdle(es))) && (TodoEffectStateMachine.__default.HasPending(es));
    };
    static FirstPendingAction(es) {
      let _0_pending = ((es).dtor_client).dtor_pending;
      return (_0_pending)[_dafny.ZERO];
    };
    static Step(es, event) {
      let _source0 = event;
      {
        if (_source0.is_UserAction) {
          let _0_action = (_source0).action;
          let _1_newClient = TodoMultiCollaboration.__default.ClientLocalDispatch((es).dtor_client, _0_action);
          let _2_newState = function (_pat_let2_0) {
            return function (_3_dt__update__tmp_h0) {
              return function (_pat_let3_0) {
                return function (_4_dt__update_hclient_h0) {
                  return TodoEffectStateMachine.EffectState.create_EffectState((_3_dt__update__tmp_h0).dtor_network, (_3_dt__update__tmp_h0).dtor_mode, _4_dt__update_hclient_h0, (_3_dt__update__tmp_h0).dtor_serverVersion);
                }(_pat_let3_0);
              }(_1_newClient);
            }(_pat_let2_0);
          }(es);
          if (TodoEffectStateMachine.__default.CanStartDispatch(_2_newState)) {
            return _dafny.Tuple.of(function (_pat_let4_0) {
  return function (_5_dt__update__tmp_h1) {
    return function (_pat_let5_0) {
      return function (_6_dt__update_hmode_h0) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_5_dt__update__tmp_h1).dtor_network, _6_dt__update_hmode_h0, (_5_dt__update__tmp_h1).dtor_client, (_5_dt__update__tmp_h1).dtor_serverVersion);
      }(_pat_let5_0);
    }(TodoEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let4_0);
}(_2_newState), TodoEffectStateMachine.Command.create_SendDispatch(TodoMultiCollaboration.__default.ClientVersion((_2_newState).dtor_client), TodoEffectStateMachine.__default.FirstPendingAction(_2_newState)));
          } else {
            return _dafny.Tuple.of(_2_newState, TodoEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_DispatchAccepted) {
          let _7_newVersion = (_source0).newVersion;
          let _8_newModel = (_source0).newModel;
          if (((es).dtor_mode).is_Dispatching) {
            let _9_newClient = TodoMultiCollaboration.__default.ClientAcceptReply((es).dtor_client, _7_newVersion, _8_newModel);
            let _10_newState = TodoEffectStateMachine.EffectState.create_EffectState((es).dtor_network, TodoEffectStateMachine.EffectMode.create_Idle(), _9_newClient, _7_newVersion);
            if (TodoEffectStateMachine.__default.CanStartDispatch(_10_newState)) {
              return _dafny.Tuple.of(function (_pat_let6_0) {
  return function (_11_dt__update__tmp_h2) {
    return function (_pat_let7_0) {
      return function (_12_dt__update_hmode_h1) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_11_dt__update__tmp_h2).dtor_network, _12_dt__update_hmode_h1, (_11_dt__update__tmp_h2).dtor_client, (_11_dt__update__tmp_h2).dtor_serverVersion);
      }(_pat_let7_0);
    }(TodoEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let6_0);
}(_10_newState), TodoEffectStateMachine.Command.create_SendDispatch(TodoMultiCollaboration.__default.ClientVersion((_10_newState).dtor_client), TodoEffectStateMachine.__default.FirstPendingAction(_10_newState)));
            } else {
              return _dafny.Tuple.of(_10_newState, TodoEffectStateMachine.Command.create_NoOp());
            }
          } else {
            return _dafny.Tuple.of(es, TodoEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_DispatchConflict) {
          let _13_freshVersion = (_source0).freshVersion;
          let _14_freshModel = (_source0).freshModel;
          if (((es).dtor_mode).is_Dispatching) {
            let _15_retries = ((es).dtor_mode).dtor_retries;
            if ((TodoEffectStateMachine.__default.MaxRetries).isLessThanOrEqualTo(_15_retries)) {
              return _dafny.Tuple.of(function (_pat_let8_0) {
  return function (_16_dt__update__tmp_h3) {
    return function (_pat_let9_0) {
      return function (_17_dt__update_hmode_h2) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_16_dt__update__tmp_h3).dtor_network, _17_dt__update_hmode_h2, (_16_dt__update__tmp_h3).dtor_client, (_16_dt__update__tmp_h3).dtor_serverVersion);
      }(_pat_let9_0);
    }(TodoEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let8_0);
}(es), TodoEffectStateMachine.Command.create_NoOp());
            } else {
              let _18_newClient = TodoMultiCollaboration.__default.HandleRealtimeUpdate((es).dtor_client, _13_freshVersion, _14_freshModel);
              let _19_newState = TodoEffectStateMachine.EffectState.create_EffectState((es).dtor_network, TodoEffectStateMachine.EffectMode.create_Dispatching((_15_retries).plus(_dafny.ONE)), _18_newClient, _13_freshVersion);
              if (TodoEffectStateMachine.__default.HasPending(_19_newState)) {
                return _dafny.Tuple.of(_19_newState, TodoEffectStateMachine.Command.create_SendDispatch(_13_freshVersion, TodoEffectStateMachine.__default.FirstPendingAction(_19_newState)));
              } else {
                return _dafny.Tuple.of(function (_pat_let10_0) {
  return function (_20_dt__update__tmp_h4) {
    return function (_pat_let11_0) {
      return function (_21_dt__update_hmode_h3) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_20_dt__update__tmp_h4).dtor_network, _21_dt__update_hmode_h3, (_20_dt__update__tmp_h4).dtor_client, (_20_dt__update__tmp_h4).dtor_serverVersion);
      }(_pat_let11_0);
    }(TodoEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let10_0);
}(_19_newState), TodoEffectStateMachine.Command.create_NoOp());
              }
            }
          } else {
            return _dafny.Tuple.of(es, TodoEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_DispatchRejected) {
          let _22_freshVersion = (_source0).freshVersion;
          let _23_freshModel = (_source0).freshModel;
          if (((es).dtor_mode).is_Dispatching) {
            let _24_newClient = TodoMultiCollaboration.__default.ClientRejectReply((es).dtor_client, _22_freshVersion, _23_freshModel);
            let _25_newState = TodoEffectStateMachine.EffectState.create_EffectState((es).dtor_network, TodoEffectStateMachine.EffectMode.create_Idle(), _24_newClient, _22_freshVersion);
            if (TodoEffectStateMachine.__default.CanStartDispatch(_25_newState)) {
              return _dafny.Tuple.of(function (_pat_let12_0) {
  return function (_26_dt__update__tmp_h5) {
    return function (_pat_let13_0) {
      return function (_27_dt__update_hmode_h4) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_26_dt__update__tmp_h5).dtor_network, _27_dt__update_hmode_h4, (_26_dt__update__tmp_h5).dtor_client, (_26_dt__update__tmp_h5).dtor_serverVersion);
      }(_pat_let13_0);
    }(TodoEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let12_0);
}(_25_newState), TodoEffectStateMachine.Command.create_SendDispatch(TodoMultiCollaboration.__default.ClientVersion((_25_newState).dtor_client), TodoEffectStateMachine.__default.FirstPendingAction(_25_newState)));
            } else {
              return _dafny.Tuple.of(_25_newState, TodoEffectStateMachine.Command.create_NoOp());
            }
          } else {
            return _dafny.Tuple.of(es, TodoEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_NetworkError) {
          return _dafny.Tuple.of(function (_pat_let14_0) {
  return function (_28_dt__update__tmp_h6) {
    return function (_pat_let15_0) {
      return function (_29_dt__update_hmode_h5) {
        return function (_pat_let16_0) {
          return function (_30_dt__update_hnetwork_h0) {
            return TodoEffectStateMachine.EffectState.create_EffectState(_30_dt__update_hnetwork_h0, _29_dt__update_hmode_h5, (_28_dt__update__tmp_h6).dtor_client, (_28_dt__update__tmp_h6).dtor_serverVersion);
          }(_pat_let16_0);
        }(TodoEffectStateMachine.NetworkStatus.create_Offline());
      }(_pat_let15_0);
    }(TodoEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let14_0);
}(es), TodoEffectStateMachine.Command.create_NoOp());
        }
      }
      {
        if (_source0.is_NetworkRestored) {
          let _31_newState = function (_pat_let17_0) {
            return function (_32_dt__update__tmp_h7) {
              return function (_pat_let18_0) {
                return function (_33_dt__update_hnetwork_h1) {
                  return TodoEffectStateMachine.EffectState.create_EffectState(_33_dt__update_hnetwork_h1, (_32_dt__update__tmp_h7).dtor_mode, (_32_dt__update__tmp_h7).dtor_client, (_32_dt__update__tmp_h7).dtor_serverVersion);
                }(_pat_let18_0);
              }(TodoEffectStateMachine.NetworkStatus.create_Online());
            }(_pat_let17_0);
          }(es);
          if (TodoEffectStateMachine.__default.CanStartDispatch(_31_newState)) {
            return _dafny.Tuple.of(function (_pat_let19_0) {
  return function (_34_dt__update__tmp_h8) {
    return function (_pat_let20_0) {
      return function (_35_dt__update_hmode_h6) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_34_dt__update__tmp_h8).dtor_network, _35_dt__update_hmode_h6, (_34_dt__update__tmp_h8).dtor_client, (_34_dt__update__tmp_h8).dtor_serverVersion);
      }(_pat_let20_0);
    }(TodoEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let19_0);
}(_31_newState), TodoEffectStateMachine.Command.create_SendDispatch(TodoMultiCollaboration.__default.ClientVersion((_31_newState).dtor_client), TodoEffectStateMachine.__default.FirstPendingAction(_31_newState)));
          } else {
            return _dafny.Tuple.of(_31_newState, TodoEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_ManualGoOffline) {
          return _dafny.Tuple.of(function (_pat_let21_0) {
  return function (_36_dt__update__tmp_h9) {
    return function (_pat_let22_0) {
      return function (_37_dt__update_hmode_h7) {
        return function (_pat_let23_0) {
          return function (_38_dt__update_hnetwork_h2) {
            return TodoEffectStateMachine.EffectState.create_EffectState(_38_dt__update_hnetwork_h2, _37_dt__update_hmode_h7, (_36_dt__update__tmp_h9).dtor_client, (_36_dt__update__tmp_h9).dtor_serverVersion);
          }(_pat_let23_0);
        }(TodoEffectStateMachine.NetworkStatus.create_Offline());
      }(_pat_let22_0);
    }(TodoEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let21_0);
}(es), TodoEffectStateMachine.Command.create_NoOp());
        }
      }
      {
        if (_source0.is_ManualGoOnline) {
          let _39_newState = function (_pat_let24_0) {
            return function (_40_dt__update__tmp_h10) {
              return function (_pat_let25_0) {
                return function (_41_dt__update_hnetwork_h3) {
                  return TodoEffectStateMachine.EffectState.create_EffectState(_41_dt__update_hnetwork_h3, (_40_dt__update__tmp_h10).dtor_mode, (_40_dt__update__tmp_h10).dtor_client, (_40_dt__update__tmp_h10).dtor_serverVersion);
                }(_pat_let25_0);
              }(TodoEffectStateMachine.NetworkStatus.create_Online());
            }(_pat_let24_0);
          }(es);
          if (TodoEffectStateMachine.__default.CanStartDispatch(_39_newState)) {
            return _dafny.Tuple.of(function (_pat_let26_0) {
  return function (_42_dt__update__tmp_h11) {
    return function (_pat_let27_0) {
      return function (_43_dt__update_hmode_h8) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_42_dt__update__tmp_h11).dtor_network, _43_dt__update_hmode_h8, (_42_dt__update__tmp_h11).dtor_client, (_42_dt__update__tmp_h11).dtor_serverVersion);
      }(_pat_let27_0);
    }(TodoEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let26_0);
}(_39_newState), TodoEffectStateMachine.Command.create_SendDispatch(TodoMultiCollaboration.__default.ClientVersion((_39_newState).dtor_client), TodoEffectStateMachine.__default.FirstPendingAction(_39_newState)));
          } else {
            return _dafny.Tuple.of(_39_newState, TodoEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (TodoEffectStateMachine.__default.CanStartDispatch(es)) {
          return _dafny.Tuple.of(function (_pat_let28_0) {
  return function (_44_dt__update__tmp_h12) {
    return function (_pat_let29_0) {
      return function (_45_dt__update_hmode_h9) {
        return TodoEffectStateMachine.EffectState.create_EffectState((_44_dt__update__tmp_h12).dtor_network, _45_dt__update_hmode_h9, (_44_dt__update__tmp_h12).dtor_client, (_44_dt__update__tmp_h12).dtor_serverVersion);
      }(_pat_let29_0);
    }(TodoEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let28_0);
}(es), TodoEffectStateMachine.Command.create_SendDispatch(TodoMultiCollaboration.__default.ClientVersion((es).dtor_client), TodoEffectStateMachine.__default.FirstPendingAction(es)));
        } else {
          return _dafny.Tuple.of(es, TodoEffectStateMachine.Command.create_NoOp());
        }
      }
    };
    static ModeConsistent(es) {
      return !(((es).dtor_mode).is_Dispatching) || (TodoEffectStateMachine.__default.HasPending(es));
    };
    static RetriesBounded(es) {
      return !(((es).dtor_mode).is_Dispatching) || ((((es).dtor_mode).dtor_retries).isLessThanOrEqualTo(TodoEffectStateMachine.__default.MaxRetries));
    };
    static Inv(es) {
      return (TodoEffectStateMachine.__default.ModeConsistent(es)) && (TodoEffectStateMachine.__default.RetriesBounded(es));
    };
    static Pending(es) {
      return ((es).dtor_client).dtor_pending;
    };
    static ProgressMeasure(es) {
      return _dafny.Tuple.of(((es).dtor_mode).is_Dispatching, (((((es).dtor_mode).is_Dispatching) && ((((es).dtor_mode).dtor_retries).isLessThanOrEqualTo(TodoEffectStateMachine.__default.MaxRetries))) ? ((TodoEffectStateMachine.__default.MaxRetries).minus(((es).dtor_mode).dtor_retries)) : (_dafny.ZERO)), TodoEffectStateMachine.__default.PendingCount(es));
    };
    static ProgressLt(m1, m2) {
      return ((((m1)[2]).isLessThan((m2)[2])) || (((((m1)[2]).isEqualTo((m2)[2])) && (!((m1)[0]))) && ((m2)[0]))) || (((((m1)[2]).isEqualTo((m2)[2])) && (((m1)[0]) === ((m2)[0]))) && (((m1)[1]).isLessThan((m2)[1])));
    };
    static Init(version, model) {
      return TodoEffectStateMachine.EffectState.create_EffectState(TodoEffectStateMachine.NetworkStatus.create_Online(), TodoEffectStateMachine.EffectMode.create_Idle(), TodoMultiCollaboration.__default.InitClient(version, model), version);
    };
    static get MaxRetries() {
      return new BigNumber(5);
    };
  };

  $module.NetworkStatus = class NetworkStatus {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Online() {
      let $dt = new NetworkStatus(0);
      return $dt;
    }
    static create_Offline() {
      let $dt = new NetworkStatus(1);
      return $dt;
    }
    get is_Online() { return this.$tag === 0; }
    get is_Offline() { return this.$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield NetworkStatus.create_Online();
      yield NetworkStatus.create_Offline();
    }
    toString() {
      if (this.$tag === 0) {
        return "TodoEffectStateMachine.NetworkStatus.Online";
      } else if (this.$tag === 1) {
        return "TodoEffectStateMachine.NetworkStatus.Offline";
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
      return TodoEffectStateMachine.NetworkStatus.create_Online();
    }
    static Rtd() {
      return class {
        static get Default() {
          return NetworkStatus.Default();
        }
      };
    }
  }

  $module.EffectMode = class EffectMode {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Idle() {
      let $dt = new EffectMode(0);
      return $dt;
    }
    static create_Dispatching(retries) {
      let $dt = new EffectMode(1);
      $dt.retries = retries;
      return $dt;
    }
    get is_Idle() { return this.$tag === 0; }
    get is_Dispatching() { return this.$tag === 1; }
    get dtor_retries() { return this.retries; }
    toString() {
      if (this.$tag === 0) {
        return "TodoEffectStateMachine.EffectMode.Idle";
      } else if (this.$tag === 1) {
        return "TodoEffectStateMachine.EffectMode.Dispatching" + "(" + _dafny.toString(this.retries) + ")";
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
        return other.$tag === 1 && _dafny.areEqual(this.retries, other.retries);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoEffectStateMachine.EffectMode.create_Idle();
    }
    static Rtd() {
      return class {
        static get Default() {
          return EffectMode.Default();
        }
      };
    }
  }

  $module.EffectState = class EffectState {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_EffectState(network, mode, client, serverVersion) {
      let $dt = new EffectState(0);
      $dt.network = network;
      $dt.mode = mode;
      $dt.client = client;
      $dt.serverVersion = serverVersion;
      return $dt;
    }
    get is_EffectState() { return this.$tag === 0; }
    get dtor_network() { return this.network; }
    get dtor_mode() { return this.mode; }
    get dtor_client() { return this.client; }
    get dtor_serverVersion() { return this.serverVersion; }
    toString() {
      if (this.$tag === 0) {
        return "TodoEffectStateMachine.EffectState.EffectState" + "(" + _dafny.toString(this.network) + ", " + _dafny.toString(this.mode) + ", " + _dafny.toString(this.client) + ", " + _dafny.toString(this.serverVersion) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.network, other.network) && _dafny.areEqual(this.mode, other.mode) && _dafny.areEqual(this.client, other.client) && _dafny.areEqual(this.serverVersion, other.serverVersion);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoEffectStateMachine.EffectState.create_EffectState(TodoEffectStateMachine.NetworkStatus.Default(), TodoEffectStateMachine.EffectMode.Default(), TodoMultiCollaboration.ClientState.Default(), _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return EffectState.Default();
        }
      };
    }
  }

  $module.Event = class Event {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_UserAction(action) {
      let $dt = new Event(0);
      $dt.action = action;
      return $dt;
    }
    static create_DispatchAccepted(newVersion, newModel) {
      let $dt = new Event(1);
      $dt.newVersion = newVersion;
      $dt.newModel = newModel;
      return $dt;
    }
    static create_DispatchConflict(freshVersion, freshModel) {
      let $dt = new Event(2);
      $dt.freshVersion = freshVersion;
      $dt.freshModel = freshModel;
      return $dt;
    }
    static create_DispatchRejected(freshVersion, freshModel) {
      let $dt = new Event(3);
      $dt.freshVersion = freshVersion;
      $dt.freshModel = freshModel;
      return $dt;
    }
    static create_NetworkError() {
      let $dt = new Event(4);
      return $dt;
    }
    static create_NetworkRestored() {
      let $dt = new Event(5);
      return $dt;
    }
    static create_ManualGoOffline() {
      let $dt = new Event(6);
      return $dt;
    }
    static create_ManualGoOnline() {
      let $dt = new Event(7);
      return $dt;
    }
    static create_Tick() {
      let $dt = new Event(8);
      return $dt;
    }
    get is_UserAction() { return this.$tag === 0; }
    get is_DispatchAccepted() { return this.$tag === 1; }
    get is_DispatchConflict() { return this.$tag === 2; }
    get is_DispatchRejected() { return this.$tag === 3; }
    get is_NetworkError() { return this.$tag === 4; }
    get is_NetworkRestored() { return this.$tag === 5; }
    get is_ManualGoOffline() { return this.$tag === 6; }
    get is_ManualGoOnline() { return this.$tag === 7; }
    get is_Tick() { return this.$tag === 8; }
    get dtor_action() { return this.action; }
    get dtor_newVersion() { return this.newVersion; }
    get dtor_newModel() { return this.newModel; }
    get dtor_freshVersion() { return this.freshVersion; }
    get dtor_freshModel() { return this.freshModel; }
    toString() {
      if (this.$tag === 0) {
        return "TodoEffectStateMachine.Event.UserAction" + "(" + _dafny.toString(this.action) + ")";
      } else if (this.$tag === 1) {
        return "TodoEffectStateMachine.Event.DispatchAccepted" + "(" + _dafny.toString(this.newVersion) + ", " + _dafny.toString(this.newModel) + ")";
      } else if (this.$tag === 2) {
        return "TodoEffectStateMachine.Event.DispatchConflict" + "(" + _dafny.toString(this.freshVersion) + ", " + _dafny.toString(this.freshModel) + ")";
      } else if (this.$tag === 3) {
        return "TodoEffectStateMachine.Event.DispatchRejected" + "(" + _dafny.toString(this.freshVersion) + ", " + _dafny.toString(this.freshModel) + ")";
      } else if (this.$tag === 4) {
        return "TodoEffectStateMachine.Event.NetworkError";
      } else if (this.$tag === 5) {
        return "TodoEffectStateMachine.Event.NetworkRestored";
      } else if (this.$tag === 6) {
        return "TodoEffectStateMachine.Event.ManualGoOffline";
      } else if (this.$tag === 7) {
        return "TodoEffectStateMachine.Event.ManualGoOnline";
      } else if (this.$tag === 8) {
        return "TodoEffectStateMachine.Event.Tick";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.action, other.action);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.newVersion, other.newVersion) && _dafny.areEqual(this.newModel, other.newModel);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.freshVersion, other.freshVersion) && _dafny.areEqual(this.freshModel, other.freshModel);
      } else if (this.$tag === 3) {
        return other.$tag === 3 && _dafny.areEqual(this.freshVersion, other.freshVersion) && _dafny.areEqual(this.freshModel, other.freshModel);
      } else if (this.$tag === 4) {
        return other.$tag === 4;
      } else if (this.$tag === 5) {
        return other.$tag === 5;
      } else if (this.$tag === 6) {
        return other.$tag === 6;
      } else if (this.$tag === 7) {
        return other.$tag === 7;
      } else if (this.$tag === 8) {
        return other.$tag === 8;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoEffectStateMachine.Event.create_UserAction(TodoDomain.Action.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Event.Default();
        }
      };
    }
  }

  $module.Command = class Command {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_NoOp() {
      let $dt = new Command(0);
      return $dt;
    }
    static create_SendDispatch(baseVersion, action) {
      let $dt = new Command(1);
      $dt.baseVersion = baseVersion;
      $dt.action = action;
      return $dt;
    }
    static create_FetchFreshState() {
      let $dt = new Command(2);
      return $dt;
    }
    get is_NoOp() { return this.$tag === 0; }
    get is_SendDispatch() { return this.$tag === 1; }
    get is_FetchFreshState() { return this.$tag === 2; }
    get dtor_baseVersion() { return this.baseVersion; }
    get dtor_action() { return this.action; }
    toString() {
      if (this.$tag === 0) {
        return "TodoEffectStateMachine.Command.NoOp";
      } else if (this.$tag === 1) {
        return "TodoEffectStateMachine.Command.SendDispatch" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.action) + ")";
      } else if (this.$tag === 2) {
        return "TodoEffectStateMachine.Command.FetchFreshState";
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
        return other.$tag === 1 && _dafny.areEqual(this.baseVersion, other.baseVersion) && _dafny.areEqual(this.action, other.action);
      } else if (this.$tag === 2) {
        return other.$tag === 2;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return TodoEffectStateMachine.Command.create_NoOp();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Command.Default();
        }
      };
    }
  }
  return $module;
})(); // end of module TodoEffectStateMachine
let TodoAppCore = (function() {
  let $module = {};

  $module.__default = class __default {
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
  return $module;
})(); // end of module TodoAppCore
let TodoEffectAppCore = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "TodoEffectAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static EffectInit(version, model) {
      return TodoEffectStateMachine.__default.Init(version, model);
    };
    static EffectStep(es, event) {
      return TodoEffectStateMachine.__default.Step(es, event);
    };
    static EffectIsOnline(es) {
      return TodoEffectStateMachine.__default.IsOnline(es);
    };
    static EffectIsIdle(es) {
      return TodoEffectStateMachine.__default.IsIdle(es);
    };
    static EffectHasPending(es) {
      return TodoEffectStateMachine.__default.HasPending(es);
    };
    static EffectPendingCount(es) {
      return TodoEffectStateMachine.__default.PendingCount(es);
    };
    static EffectGetClient(es) {
      return (es).dtor_client;
    };
    static EffectGetServerVersion(es) {
      return (es).dtor_serverVersion;
    };
    static EffectIsDispatching(es) {
      return ((es).dtor_mode).is_Dispatching;
    };
    static EffectUserAction(action) {
      return TodoEffectStateMachine.Event.create_UserAction(action);
    };
    static EffectDispatchAccepted(version, model) {
      return TodoEffectStateMachine.Event.create_DispatchAccepted(version, model);
    };
    static EffectDispatchConflict(version, model) {
      return TodoEffectStateMachine.Event.create_DispatchConflict(version, model);
    };
    static EffectDispatchRejected(version, model) {
      return TodoEffectStateMachine.Event.create_DispatchRejected(version, model);
    };
    static EffectNetworkError() {
      return TodoEffectStateMachine.Event.create_NetworkError();
    };
    static EffectNetworkRestored() {
      return TodoEffectStateMachine.Event.create_NetworkRestored();
    };
    static EffectManualGoOffline() {
      return TodoEffectStateMachine.Event.create_ManualGoOffline();
    };
    static EffectManualGoOnline() {
      return TodoEffectStateMachine.Event.create_ManualGoOnline();
    };
    static EffectTick() {
      return TodoEffectStateMachine.Event.create_Tick();
    };
    static EffectIsNoOp(cmd) {
      return (cmd).is_NoOp;
    };
    static EffectIsSendDispatch(cmd) {
      return (cmd).is_SendDispatch;
    };
    static EffectGetBaseVersion(cmd) {
      return (cmd).dtor_baseVersion;
    };
    static EffectGetAction(cmd) {
      return (cmd).dtor_action;
    };
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
  return $module;
})(); // end of module TodoEffectAppCore
let _module = (function() {
  let $module = {};

  return $module;
})(); // end of module _module
