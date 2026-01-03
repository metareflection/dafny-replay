// Dafny program ClearSplitEffectStateMachine.dfy compiled into JavaScript
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
let ClearSplit = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplit._default";
    }
    _parentTraits() {
      return [];
    }
    static GetFromMap(b, p) {
      if ((b).contains(p)) {
        return (b).get(p);
      } else {
        return _dafny.ZERO;
      }
    };
    static Step(model, a) {
      let result = ClearSplit.Result.Default(ClearSplit.Model.Default());
      let _source0 = a;
      Lmatch0: {
        {
          if (_source0.is_AddExpense) {
            let _0_e = (_source0).e;
            if (ClearSplit.__default.ValidExpenseCheck((model).dtor_members, _0_e)) {
              result = ClearSplit.Result.create_Ok(ClearSplit.Model.create_Model((model).dtor_members, (model).dtor_memberList, _dafny.Seq.Concat((model).dtor_expenses, _dafny.Seq.of(_0_e)), (model).dtor_settlements));
            } else {
              result = ClearSplit.Result.create_Error(ClearSplit.Err.create_BadExpense());
            }
            break Lmatch0;
          }
        }
        {
          let _1_s = (_source0).s;
          if (ClearSplit.__default.ValidSettlement((model).dtor_members, _1_s)) {
            result = ClearSplit.Result.create_Ok(ClearSplit.Model.create_Model((model).dtor_members, (model).dtor_memberList, (model).dtor_expenses, _dafny.Seq.Concat((model).dtor_settlements, _dafny.Seq.of(_1_s))));
          } else {
            result = ClearSplit.Result.create_Error(ClearSplit.Err.create_BadSettlement());
          }
        }
      }
      return result;
    }
    static Init(memberList) {
      let result = ClearSplit.Result.Default(ClearSplit.Model.Default());
      if (!(ClearSplit.__default.NoDuplicates(memberList))) {
        result = ClearSplit.Result.create_Error(ClearSplit.Err.create_BadExpense());
        return result;
      }
      let _0_members;
      _0_members = function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of _dafny.IntegerRange(_dafny.ZERO, new BigNumber((memberList).length))) {
          let _1_i = _compr_0;
          if (((_dafny.ZERO).isLessThanOrEqualTo(_1_i)) && ((_1_i).isLessThan(new BigNumber((memberList).length)))) {
            _coll0.add((memberList)[_1_i]);
          }
        }
        return _coll0;
      }();
      result = ClearSplit.Result.create_Ok(ClearSplit.Model.create_Model(_0_members, memberList, _dafny.Seq.of(), _dafny.Seq.of()));
      return result;
    }
    static GetCertificate(model) {
      let cert = ClearSplit.Certificate.Default();
      cert = ClearSplit.Certificate.create_Certificate(new BigNumber(((model).dtor_members).length), new BigNumber(((model).dtor_expenses).length), new BigNumber(((model).dtor_settlements).length), true);
      return cert;
    }
    static NoDuplicates(s) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((s).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return _dafny.Quantifier(_dafny.IntegerRange((_0_i).plus(_dafny.ONE), new BigNumber((s).length)), true, function (_forall_var_1) {
          let _1_j = _forall_var_1;
          return !((((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(_1_j))) && ((_1_j).isLessThan(new BigNumber((s).length)))) || (!_dafny.areEqual((s)[_0_i], (s)[_1_j]));
        });
      });
    };
    static SumValuesSeq(m, keys) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((keys).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          let _1_k = (keys)[_dafny.ZERO];
          let _2_rest = (keys).slice(_dafny.ONE);
          if ((m).contains(_1_k)) {
            _0___accumulator = (_0___accumulator).plus((m).get(_1_k));
            let _in0 = (m).Subtract(_dafny.Set.fromElements(_1_k));
            let _in1 = _2_rest;
            m = _in0;
            keys = _in1;
            continue TAIL_CALL_START;
          } else {
            let _in2 = m;
            let _in3 = _2_rest;
            m = _in2;
            keys = _in3;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static ShareKeysOk(e) {
      return (((new BigNumber(((e).dtor_shareKeys).length)).isEqualTo(new BigNumber(((e).dtor_shares).length))) && (ClearSplit.__default.NoDuplicates((e).dtor_shareKeys))) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(((e).dtor_shareKeys).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber(((e).dtor_shareKeys).length)))) || (((e).dtor_shares).contains(((e).dtor_shareKeys)[_0_i]));
      }));
    };
    static AllSharesValid(members, shares, keys) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((keys).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((keys).length)))) || ((((members).contains((keys)[_0_i])) && ((shares).contains((keys)[_0_i]))) && ((_dafny.ZERO).isLessThanOrEqualTo((shares).get((keys)[_0_i]))));
      });
    };
    static ValidExpenseCheck(members, e) {
      return ((((ClearSplit.__default.ShareKeysOk(e)) && ((_dafny.ZERO).isLessThanOrEqualTo((e).dtor_amount))) && ((members).contains((e).dtor_paidBy))) && (ClearSplit.__default.AllSharesValid(members, (e).dtor_shares, (e).dtor_shareKeys))) && ((ClearSplit.__default.SumValuesSeq((e).dtor_shares, (e).dtor_shareKeys)).isEqualTo((e).dtor_amount));
    };
    static ValidSettlement(members, s) {
      return ((((_dafny.ZERO).isLessThanOrEqualTo((s).dtor_amount)) && ((members).contains((s).dtor_from))) && ((members).contains((s).dtor_to))) && (!_dafny.areEqual((s).dtor_from, (s).dtor_to));
    };
    static AddToMap(b, p, delta) {
      if ((b).contains(p)) {
        return (b).update(p, ((b).get(p)).plus(delta));
      } else {
        return (b).update(p, delta);
      }
    };
    static ZeroBalancesSeq(memberList) {
      if ((new BigNumber((memberList).length)).isEqualTo(_dafny.ZERO)) {
        return _dafny.Map.Empty.slice();
      } else {
        let _0_p = (memberList)[_dafny.ZERO];
        return (ClearSplit.__default.ZeroBalancesSeq((memberList).slice(_dafny.ONE))).update(_0_p, _dafny.ZERO);
      }
    };
    static ApplySharesSeq(b, shares, keys) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((keys).length)).isEqualTo(_dafny.ZERO)) {
          return b;
        } else {
          let _0_p = (keys)[_dafny.ZERO];
          let _1_rest = (keys).slice(_dafny.ONE);
          if ((shares).contains(_0_p)) {
            let _in0 = ClearSplit.__default.AddToMap(b, _0_p, (_dafny.ZERO).minus((shares).get(_0_p)));
            let _in1 = shares;
            let _in2 = _1_rest;
            b = _in0;
            shares = _in1;
            keys = _in2;
            continue TAIL_CALL_START;
          } else {
            let _in3 = b;
            let _in4 = shares;
            let _in5 = _1_rest;
            b = _in3;
            shares = _in4;
            keys = _in5;
            continue TAIL_CALL_START;
          }
        }
      }
    };
    static ApplyExpenseToBalances(b, e) {
      let _0_b_k = ClearSplit.__default.AddToMap(b, (e).dtor_paidBy, (e).dtor_amount);
      return ClearSplit.__default.ApplySharesSeq(_0_b_k, (e).dtor_shares, (e).dtor_shareKeys);
    };
    static ApplySettlementToBalances(b, s) {
      let _0_b_k = ClearSplit.__default.AddToMap(b, (s).dtor_from, (s).dtor_amount);
      return ClearSplit.__default.AddToMap(_0_b_k, (s).dtor_to, (_dafny.ZERO).minus((s).dtor_amount));
    };
    static ApplyExpensesSeq(b, expenses) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((expenses).length)).isEqualTo(_dafny.ZERO)) {
          return b;
        } else {
          let _0_b_k = ClearSplit.__default.ApplyExpenseToBalances(b, (expenses)[_dafny.ZERO]);
          let _in0 = _0_b_k;
          let _in1 = (expenses).slice(_dafny.ONE);
          b = _in0;
          expenses = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static ApplySettlementsSeq(b, settlements) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((settlements).length)).isEqualTo(_dafny.ZERO)) {
          return b;
        } else {
          let _0_b_k = ClearSplit.__default.ApplySettlementToBalances(b, (settlements)[_dafny.ZERO]);
          let _in0 = _0_b_k;
          let _in1 = (settlements).slice(_dafny.ONE);
          b = _in0;
          settlements = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static Balances(model) {
      let _0_b = ClearSplit.__default.ZeroBalancesSeq((model).dtor_memberList);
      let _1_b_k = ClearSplit.__default.ApplyExpensesSeq(_0_b, (model).dtor_expenses);
      return ClearSplit.__default.ApplySettlementsSeq(_1_b_k, (model).dtor_settlements);
    };
    static GetBalance(model, p) {
      let _0_b = ClearSplit.__default.Balances(model);
      if ((_0_b).contains(p)) {
        return (_0_b).get(p);
      } else {
        return _dafny.ZERO;
      }
    };
    static SumSeq(s) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((s).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          _0___accumulator = (_0___accumulator).plus((s)[_dafny.ZERO]);
          let _in0 = (s).slice(_dafny.ONE);
          s = _in0;
          continue TAIL_CALL_START;
        }
      }
    };
    static ExpenseDeltaForPerson(e, p) {
      let _0_payerDelta = ((_dafny.areEqual(p, (e).dtor_paidBy)) ? ((e).dtor_amount) : (_dafny.ZERO));
      let _1_shareDelta = ((((e).dtor_shares).contains(p)) ? ((_dafny.ZERO).minus(((e).dtor_shares).get(p))) : (_dafny.ZERO));
      return (_0_payerDelta).plus(_1_shareDelta);
    };
    static ExpenseDeltas(expenses, p) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((expenses).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of());
        } else {
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of(ClearSplit.__default.ExpenseDeltaForPerson((expenses)[_dafny.ZERO], p)));
          let _in0 = (expenses).slice(_dafny.ONE);
          let _in1 = p;
          expenses = _in0;
          p = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static SettlementDeltaForPerson(s, p) {
      let _0_fromDelta = ((_dafny.areEqual(p, (s).dtor_from)) ? ((s).dtor_amount) : (_dafny.ZERO));
      let _1_toDelta = ((_dafny.areEqual(p, (s).dtor_to)) ? ((_dafny.ZERO).minus((s).dtor_amount)) : (_dafny.ZERO));
      return (_0_fromDelta).plus(_1_toDelta);
    };
    static SettlementDeltas(settlements, p) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((settlements).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of());
        } else {
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of(ClearSplit.__default.SettlementDeltaForPerson((settlements)[_dafny.ZERO], p)));
          let _in0 = (settlements).slice(_dafny.ONE);
          let _in1 = p;
          settlements = _in0;
          p = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static ExplainExpenses(model, p) {
      return _dafny.Seq.Concat(ClearSplit.__default.ExpenseDeltas((model).dtor_expenses, p), ClearSplit.__default.SettlementDeltas((model).dtor_settlements, p));
    };
  };

  $module.Expense = class Expense {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Expense(paidBy, amount, shares, shareKeys) {
      let $dt = new Expense(0);
      $dt.paidBy = paidBy;
      $dt.amount = amount;
      $dt.shares = shares;
      $dt.shareKeys = shareKeys;
      return $dt;
    }
    get is_Expense() { return this.$tag === 0; }
    get dtor_paidBy() { return this.paidBy; }
    get dtor_amount() { return this.amount; }
    get dtor_shares() { return this.shares; }
    get dtor_shareKeys() { return this.shareKeys; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Expense.Expense" + "(" + this.paidBy.toVerbatimString(true) + ", " + _dafny.toString(this.amount) + ", " + _dafny.toString(this.shares) + ", " + _dafny.toString(this.shareKeys) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.paidBy, other.paidBy) && _dafny.areEqual(this.amount, other.amount) && _dafny.areEqual(this.shares, other.shares) && _dafny.areEqual(this.shareKeys, other.shareKeys);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplit.Expense.create_Expense(_dafny.Seq.UnicodeFromString(""), _dafny.ZERO, _dafny.Map.Empty, _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Expense.Default();
        }
      };
    }
  }

  $module.Settlement = class Settlement {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Settlement(from, to, amount) {
      let $dt = new Settlement(0);
      $dt.from = from;
      $dt.to = to;
      $dt.amount = amount;
      return $dt;
    }
    get is_Settlement() { return this.$tag === 0; }
    get dtor_from() { return this.from; }
    get dtor_to() { return this.to; }
    get dtor_amount() { return this.amount; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Settlement.Settlement" + "(" + this.from.toVerbatimString(true) + ", " + this.to.toVerbatimString(true) + ", " + _dafny.toString(this.amount) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.from, other.from) && _dafny.areEqual(this.to, other.to) && _dafny.areEqual(this.amount, other.amount);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplit.Settlement.create_Settlement(_dafny.Seq.UnicodeFromString(""), _dafny.Seq.UnicodeFromString(""), _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Settlement.Default();
        }
      };
    }
  }

  $module.Model = class Model {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Model(members, memberList, expenses, settlements) {
      let $dt = new Model(0);
      $dt.members = members;
      $dt.memberList = memberList;
      $dt.expenses = expenses;
      $dt.settlements = settlements;
      return $dt;
    }
    get is_Model() { return this.$tag === 0; }
    get dtor_members() { return this.members; }
    get dtor_memberList() { return this.memberList; }
    get dtor_expenses() { return this.expenses; }
    get dtor_settlements() { return this.settlements; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Model.Model" + "(" + _dafny.toString(this.members) + ", " + _dafny.toString(this.memberList) + ", " + _dafny.toString(this.expenses) + ", " + _dafny.toString(this.settlements) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.members, other.members) && _dafny.areEqual(this.memberList, other.memberList) && _dafny.areEqual(this.expenses, other.expenses) && _dafny.areEqual(this.settlements, other.settlements);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplit.Model.create_Model(_dafny.Set.Empty, _dafny.Seq.of(), _dafny.Seq.of(), _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Model.Default();
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
    static create_Error(error) {
      let $dt = new Result(1);
      $dt.error = error;
      return $dt;
    }
    get is_Ok() { return this.$tag === 0; }
    get is_Error() { return this.$tag === 1; }
    get dtor_value() { return this.value; }
    get dtor_error() { return this.error; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Result.Ok" + "(" + _dafny.toString(this.value) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplit.Result.Error" + "(" + _dafny.toString(this.error) + ")";
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
      return ClearSplit.Result.create_Ok(_default_T);
    }
    static Rtd(rtd$_T) {
      return class {
        static get Default() {
          return Result.Default(rtd$_T.Default);
        }
      };
    }
  }

  $module.Err = class Err {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_NotMember(p) {
      let $dt = new Err(0);
      $dt.p = p;
      return $dt;
    }
    static create_BadExpense() {
      let $dt = new Err(1);
      return $dt;
    }
    static create_BadSettlement() {
      let $dt = new Err(2);
      return $dt;
    }
    get is_NotMember() { return this.$tag === 0; }
    get is_BadExpense() { return this.$tag === 1; }
    get is_BadSettlement() { return this.$tag === 2; }
    get dtor_p() { return this.p; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Err.NotMember" + "(" + this.p.toVerbatimString(true) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplit.Err.BadExpense";
      } else if (this.$tag === 2) {
        return "ClearSplit.Err.BadSettlement";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.p, other.p);
      } else if (this.$tag === 1) {
        return other.$tag === 1;
      } else if (this.$tag === 2) {
        return other.$tag === 2;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplit.Err.create_NotMember(_dafny.Seq.UnicodeFromString(""));
    }
    static Rtd() {
      return class {
        static get Default() {
          return Err.Default();
        }
      };
    }
  }

  $module.Action = class Action {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_AddExpense(e) {
      let $dt = new Action(0);
      $dt.e = e;
      return $dt;
    }
    static create_AddSettlement(s) {
      let $dt = new Action(1);
      $dt.s = s;
      return $dt;
    }
    get is_AddExpense() { return this.$tag === 0; }
    get is_AddSettlement() { return this.$tag === 1; }
    get dtor_e() { return this.e; }
    get dtor_s() { return this.s; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Action.AddExpense" + "(" + _dafny.toString(this.e) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplit.Action.AddSettlement" + "(" + _dafny.toString(this.s) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.e, other.e);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.s, other.s);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplit.Action.create_AddExpense(ClearSplit.Expense.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Action.Default();
        }
      };
    }
  }

  $module.Certificate = class Certificate {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Certificate(memberCount, expenseCount, settlementCount, conservationHolds) {
      let $dt = new Certificate(0);
      $dt.memberCount = memberCount;
      $dt.expenseCount = expenseCount;
      $dt.settlementCount = settlementCount;
      $dt.conservationHolds = conservationHolds;
      return $dt;
    }
    get is_Certificate() { return this.$tag === 0; }
    get dtor_memberCount() { return this.memberCount; }
    get dtor_expenseCount() { return this.expenseCount; }
    get dtor_settlementCount() { return this.settlementCount; }
    get dtor_conservationHolds() { return this.conservationHolds; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplit.Certificate.Certificate" + "(" + _dafny.toString(this.memberCount) + ", " + _dafny.toString(this.expenseCount) + ", " + _dafny.toString(this.settlementCount) + ", " + _dafny.toString(this.conservationHolds) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.memberCount, other.memberCount) && _dafny.areEqual(this.expenseCount, other.expenseCount) && _dafny.areEqual(this.settlementCount, other.settlementCount) && this.conservationHolds === other.conservationHolds;
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplit.Certificate.create_Certificate(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO, false);
    }
    static Rtd() {
      return class {
        static get Default() {
          return Certificate.Default();
        }
      };
    }
  }
  return $module;
})(); // end of module ClearSplit
let ClearSplitDomain = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitDomain._default";
    }
    _parentTraits() {
      return [];
    }
    static RejectErr() {
      return ClearSplitDomain.Err.create_Rejected();
    };
    static Init() {
      return ClearSplit.Model.create_Model(_dafny.Set.fromElements(), _dafny.Seq.of(), _dafny.Seq.of(), _dafny.Seq.of());
    };
    static TryStep(m, a) {
      let _source0 = a;
      {
        if (_source0.is_AddExpense) {
          let _0_e = (_source0).e;
          if (ClearSplit.__default.ValidExpenseCheck((m).dtor_members, _0_e)) {
            return ClearSplitDomain.Result.create_Ok(ClearSplit.Model.create_Model((m).dtor_members, (m).dtor_memberList, _dafny.Seq.Concat((m).dtor_expenses, _dafny.Seq.of(_0_e)), (m).dtor_settlements));
          } else {
            return ClearSplitDomain.Result.create_Err(ClearSplitDomain.Err.create_BadExpense());
          }
        }
      }
      {
        let _1_s = (_source0).s;
        if (ClearSplit.__default.ValidSettlement((m).dtor_members, _1_s)) {
          return ClearSplitDomain.Result.create_Ok(ClearSplit.Model.create_Model((m).dtor_members, (m).dtor_memberList, (m).dtor_expenses, _dafny.Seq.Concat((m).dtor_settlements, _dafny.Seq.of(_1_s))));
        } else {
          return ClearSplitDomain.Result.create_Err(ClearSplitDomain.Err.create_BadSettlement());
        }
      }
    };
    static Rebase(remote, local) {
      return local;
    };
    static Candidates(m, a) {
      return _dafny.Seq.of(a);
    };
    static RebaseThroughSuffix(suffix, a) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((suffix).length)).isEqualTo(_dafny.ZERO)) {
          return a;
        } else {
          let _in0 = (suffix).slice(0, (new BigNumber((suffix).length)).minus(_dafny.ONE));
          let _in1 = ClearSplitDomain.__default.Rebase((suffix)[(new BigNumber((suffix).length)).minus(_dafny.ONE)], a);
          suffix = _in0;
          a = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
  };

  $module.Action = class Action {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_AddExpense(e) {
      let $dt = new Action(0);
      $dt.e = e;
      return $dt;
    }
    static create_AddSettlement(s) {
      let $dt = new Action(1);
      $dt.s = s;
      return $dt;
    }
    get is_AddExpense() { return this.$tag === 0; }
    get is_AddSettlement() { return this.$tag === 1; }
    get dtor_e() { return this.e; }
    get dtor_s() { return this.s; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplitDomain.Action.AddExpense" + "(" + _dafny.toString(this.e) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplitDomain.Action.AddSettlement" + "(" + _dafny.toString(this.s) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.e, other.e);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.s, other.s);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplitDomain.Action.create_AddExpense(ClearSplit.Expense.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return Action.Default();
        }
      };
    }
  }

  $module.Err = class Err {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_BadExpense() {
      let $dt = new Err(0);
      return $dt;
    }
    static create_BadSettlement() {
      let $dt = new Err(1);
      return $dt;
    }
    static create_Rejected() {
      let $dt = new Err(2);
      return $dt;
    }
    get is_BadExpense() { return this.$tag === 0; }
    get is_BadSettlement() { return this.$tag === 1; }
    get is_Rejected() { return this.$tag === 2; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Err.create_BadExpense();
      yield Err.create_BadSettlement();
      yield Err.create_Rejected();
    }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplitDomain.Err.BadExpense";
      } else if (this.$tag === 1) {
        return "ClearSplitDomain.Err.BadSettlement";
      } else if (this.$tag === 2) {
        return "ClearSplitDomain.Err.Rejected";
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
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplitDomain.Err.create_BadExpense();
    }
    static Rtd() {
      return class {
        static get Default() {
          return Err.Default();
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
        return "ClearSplitDomain.Result.Ok" + "(" + _dafny.toString(this.value) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplitDomain.Result.Err" + "(" + _dafny.toString(this.error) + ")";
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
      return ClearSplitDomain.Result.create_Ok(_default_T);
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
})(); // end of module ClearSplitDomain
let ClearSplitMultiCollaboration = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitMultiCollaboration._default";
    }
    _parentTraits() {
      return [];
    }
    static Version(s) {
      return new BigNumber(((s).dtor_appliedLog).length);
    };
    static InitServer() {
      return ClearSplitMultiCollaboration.ServerState.create_ServerState(ClearSplitDomain.__default.Init(), _dafny.Seq.of(), _dafny.Seq.of());
    };
    static ChooseCandidate(m, cs) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cs).length)).isEqualTo(_dafny.ZERO)) {
          return ClearSplitDomain.Result.create_Err(ClearSplitDomain.__default.RejectErr());
        } else {
          let _source0 = ClearSplitDomain.__default.TryStep(m, (cs)[_dafny.ZERO]);
          {
            if (_source0.is_Ok) {
              let _0_m2 = (_source0).value;
              return ClearSplitDomain.Result.create_Ok(_dafny.Tuple.of(_0_m2, (cs)[_dafny.ZERO]));
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
      let _1_rebased = ClearSplitDomain.__default.RebaseThroughSuffix(_0_suffix, orig);
      let _2_cs = ClearSplitDomain.__default.Candidates((s).dtor_present, _1_rebased);
      let _source0 = ClearSplitMultiCollaboration.__default.ChooseCandidate((s).dtor_present, _2_cs);
      {
        if (_source0.is_Ok) {
          let _3_pair = (_source0).value;
          let _4_m2 = (_3_pair)[0];
          let _5_chosen = (_3_pair)[1];
          let _6_noChange = _dafny.areEqual(_4_m2, (s).dtor_present);
          let _7_newApplied = _dafny.Seq.Concat((s).dtor_appliedLog, _dafny.Seq.of(_5_chosen));
          let _8_rec = ClearSplitMultiCollaboration.RequestRecord.create_Req(baseVersion, orig, _1_rebased, _5_chosen, ClearSplitMultiCollaboration.RequestOutcome.create_AuditAccepted(_5_chosen, _6_noChange));
          let _9_newAudit = _dafny.Seq.Concat((s).dtor_auditLog, _dafny.Seq.of(_8_rec));
          return _dafny.Tuple.of(ClearSplitMultiCollaboration.ServerState.create_ServerState(_4_m2, _7_newApplied, _9_newAudit), ClearSplitMultiCollaboration.Reply.create_Accepted(new BigNumber((_7_newApplied).length), _4_m2, _5_chosen, _6_noChange));
        }
      }
      {
        let _10_rec = ClearSplitMultiCollaboration.RequestRecord.create_Req(baseVersion, orig, _1_rebased, _1_rebased, ClearSplitMultiCollaboration.RequestOutcome.create_AuditRejected(ClearSplitMultiCollaboration.RejectReason.create_DomainInvalid(), _1_rebased));
        let _11_newAudit = _dafny.Seq.Concat((s).dtor_auditLog, _dafny.Seq.of(_10_rec));
        return _dafny.Tuple.of(ClearSplitMultiCollaboration.ServerState.create_ServerState((s).dtor_present, (s).dtor_appliedLog, _11_newAudit), ClearSplitMultiCollaboration.Reply.create_Rejected(ClearSplitMultiCollaboration.RejectReason.create_DomainInvalid(), _1_rebased));
      }
    };
    static InitClient(version, model) {
      return ClearSplitMultiCollaboration.ClientState.create_ClientState(version, model, _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return ClearSplitMultiCollaboration.ClientState.create_ClientState(ClearSplitMultiCollaboration.__default.Version(server), (server).dtor_present, _dafny.Seq.of());
    };
    static Sync(server) {
      return ClearSplitMultiCollaboration.ClientState.create_ClientState(ClearSplitMultiCollaboration.__default.Version(server), (server).dtor_present, _dafny.Seq.of());
    };
    static ClientLocalDispatch(client, action) {
      let _0_result = ClearSplitDomain.__default.TryStep((client).dtor_present, action);
      let _source0 = _0_result;
      {
        if (_source0.is_Ok) {
          let _1_newModel = (_source0).value;
          return ClearSplitMultiCollaboration.ClientState.create_ClientState((client).dtor_baseVersion, _1_newModel, _dafny.Seq.Concat((client).dtor_pending, _dafny.Seq.of(action)));
        }
      }
      {
        return ClearSplitMultiCollaboration.ClientState.create_ClientState((client).dtor_baseVersion, (client).dtor_present, _dafny.Seq.Concat((client).dtor_pending, _dafny.Seq.of(action)));
      }
    };
    static ReapplyPending(model, pending) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((pending).length)).isEqualTo(_dafny.ZERO)) {
          return model;
        } else {
          let _0_result = ClearSplitDomain.__default.TryStep(model, (pending)[_dafny.ZERO]);
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
        let _0_newPresent = ClearSplitMultiCollaboration.__default.ReapplyPending(serverModel, (client).dtor_pending);
        return ClearSplitMultiCollaboration.ClientState.create_ClientState(serverVersion, _0_newPresent, (client).dtor_pending);
      } else {
        return client;
      }
    };
    static ClientAcceptReply(client, newVersion, newPresent) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return ClearSplitMultiCollaboration.ClientState.create_ClientState(newVersion, newPresent, _dafny.Seq.of());
      } else {
        let _0_rest = ((client).dtor_pending).slice(_dafny.ONE);
        let _1_reappliedPresent = ClearSplitMultiCollaboration.__default.ReapplyPending(newPresent, _0_rest);
        return ClearSplitMultiCollaboration.ClientState.create_ClientState(newVersion, _1_reappliedPresent, _0_rest);
      }
    };
    static ClientRejectReply(client, freshVersion, freshModel) {
      if ((new BigNumber(((client).dtor_pending).length)).isEqualTo(_dafny.ZERO)) {
        return ClearSplitMultiCollaboration.ClientState.create_ClientState(freshVersion, freshModel, _dafny.Seq.of());
      } else {
        let _0_rest = ((client).dtor_pending).slice(_dafny.ONE);
        let _1_reappliedPresent = ClearSplitMultiCollaboration.__default.ReapplyPending(freshModel, _0_rest);
        return ClearSplitMultiCollaboration.ClientState.create_ClientState(freshVersion, _1_reappliedPresent, _0_rest);
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
        return "ClearSplitMultiCollaboration.RejectReason.DomainInvalid";
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
      return ClearSplitMultiCollaboration.RejectReason.create_DomainInvalid();
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
        return "ClearSplitMultiCollaboration.Reply.Accepted" + "(" + _dafny.toString(this.newVersion) + ", " + _dafny.toString(this.newPresent) + ", " + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplitMultiCollaboration.Reply.Rejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
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
      return ClearSplitMultiCollaboration.Reply.create_Accepted(_dafny.ZERO, ClearSplit.Model.Default(), ClearSplitDomain.Action.Default(), false);
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
        return "ClearSplitMultiCollaboration.RequestOutcome.AuditAccepted" + "(" + _dafny.toString(this.applied) + ", " + _dafny.toString(this.noChange) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplitMultiCollaboration.RequestOutcome.AuditRejected" + "(" + _dafny.toString(this.reason) + ", " + _dafny.toString(this.rebased) + ")";
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
      return ClearSplitMultiCollaboration.RequestOutcome.create_AuditAccepted(ClearSplitDomain.Action.Default(), false);
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
        return "ClearSplitMultiCollaboration.RequestRecord.Req" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.orig) + ", " + _dafny.toString(this.rebased) + ", " + _dafny.toString(this.chosen) + ", " + _dafny.toString(this.outcome) + ")";
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
      return ClearSplitMultiCollaboration.RequestRecord.create_Req(_dafny.ZERO, ClearSplitDomain.Action.Default(), ClearSplitDomain.Action.Default(), ClearSplitDomain.Action.Default(), ClearSplitMultiCollaboration.RequestOutcome.Default());
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
        return "ClearSplitMultiCollaboration.ServerState.ServerState" + "(" + _dafny.toString(this.present) + ", " + _dafny.toString(this.appliedLog) + ", " + _dafny.toString(this.auditLog) + ")";
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
      return ClearSplitMultiCollaboration.ServerState.create_ServerState(ClearSplit.Model.Default(), _dafny.Seq.of(), _dafny.Seq.of());
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
        return "ClearSplitMultiCollaboration.ClientState.ClientState" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.pending) + ")";
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
      return ClearSplitMultiCollaboration.ClientState.create_ClientState(_dafny.ZERO, ClearSplit.Model.Default(), _dafny.Seq.of());
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
})(); // end of module ClearSplitMultiCollaboration
let ClearSplitEffectStateMachine = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitEffectStateMachine._default";
    }
    _parentTraits() {
      return [];
    }
    static PendingCount(es) {
      return ClearSplitMultiCollaboration.__default.PendingCount((es).dtor_client);
    };
    static HasPending(es) {
      return (_dafny.ZERO).isLessThan(ClearSplitEffectStateMachine.__default.PendingCount(es));
    };
    static IsOnline(es) {
      return _dafny.areEqual((es).dtor_network, ClearSplitEffectStateMachine.NetworkStatus.create_Online());
    };
    static IsIdle(es) {
      return _dafny.areEqual((es).dtor_mode, ClearSplitEffectStateMachine.EffectMode.create_Idle());
    };
    static CanStartDispatch(es) {
      return ((ClearSplitEffectStateMachine.__default.IsOnline(es)) && (ClearSplitEffectStateMachine.__default.IsIdle(es))) && (ClearSplitEffectStateMachine.__default.HasPending(es));
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
          let _1_newClient = ClearSplitMultiCollaboration.__default.ClientLocalDispatch((es).dtor_client, _0_action);
          let _2_newState = function (_pat_let0_0) {
            return function (_3_dt__update__tmp_h0) {
              return function (_pat_let1_0) {
                return function (_4_dt__update_hclient_h0) {
                  return ClearSplitEffectStateMachine.EffectState.create_EffectState((_3_dt__update__tmp_h0).dtor_network, (_3_dt__update__tmp_h0).dtor_mode, _4_dt__update_hclient_h0, (_3_dt__update__tmp_h0).dtor_serverVersion);
                }(_pat_let1_0);
              }(_1_newClient);
            }(_pat_let0_0);
          }(es);
          if (ClearSplitEffectStateMachine.__default.CanStartDispatch(_2_newState)) {
            return _dafny.Tuple.of(function (_pat_let2_0) {
  return function (_5_dt__update__tmp_h1) {
    return function (_pat_let3_0) {
      return function (_6_dt__update_hmode_h0) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_5_dt__update__tmp_h1).dtor_network, _6_dt__update_hmode_h0, (_5_dt__update__tmp_h1).dtor_client, (_5_dt__update__tmp_h1).dtor_serverVersion);
      }(_pat_let3_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let2_0);
}(_2_newState), ClearSplitEffectStateMachine.Command.create_SendDispatch(ClearSplitMultiCollaboration.__default.ClientVersion((_2_newState).dtor_client), ClearSplitEffectStateMachine.__default.FirstPendingAction(_2_newState)));
          } else {
            return _dafny.Tuple.of(_2_newState, ClearSplitEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_DispatchAccepted) {
          let _7_newVersion = (_source0).newVersion;
          let _8_newModel = (_source0).newModel;
          if (((es).dtor_mode).is_Dispatching) {
            let _9_newClient = ClearSplitMultiCollaboration.__default.ClientAcceptReply((es).dtor_client, _7_newVersion, _8_newModel);
            let _10_newState = ClearSplitEffectStateMachine.EffectState.create_EffectState((es).dtor_network, ClearSplitEffectStateMachine.EffectMode.create_Idle(), _9_newClient, _7_newVersion);
            if (ClearSplitEffectStateMachine.__default.CanStartDispatch(_10_newState)) {
              return _dafny.Tuple.of(function (_pat_let4_0) {
  return function (_11_dt__update__tmp_h2) {
    return function (_pat_let5_0) {
      return function (_12_dt__update_hmode_h1) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_11_dt__update__tmp_h2).dtor_network, _12_dt__update_hmode_h1, (_11_dt__update__tmp_h2).dtor_client, (_11_dt__update__tmp_h2).dtor_serverVersion);
      }(_pat_let5_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let4_0);
}(_10_newState), ClearSplitEffectStateMachine.Command.create_SendDispatch(ClearSplitMultiCollaboration.__default.ClientVersion((_10_newState).dtor_client), ClearSplitEffectStateMachine.__default.FirstPendingAction(_10_newState)));
            } else {
              return _dafny.Tuple.of(_10_newState, ClearSplitEffectStateMachine.Command.create_NoOp());
            }
          } else {
            return _dafny.Tuple.of(es, ClearSplitEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_DispatchConflict) {
          let _13_freshVersion = (_source0).freshVersion;
          let _14_freshModel = (_source0).freshModel;
          if (((es).dtor_mode).is_Dispatching) {
            let _15_retries = ((es).dtor_mode).dtor_retries;
            if ((ClearSplitEffectStateMachine.__default.MaxRetries).isLessThanOrEqualTo(_15_retries)) {
              return _dafny.Tuple.of(function (_pat_let6_0) {
  return function (_16_dt__update__tmp_h3) {
    return function (_pat_let7_0) {
      return function (_17_dt__update_hmode_h2) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_16_dt__update__tmp_h3).dtor_network, _17_dt__update_hmode_h2, (_16_dt__update__tmp_h3).dtor_client, (_16_dt__update__tmp_h3).dtor_serverVersion);
      }(_pat_let7_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let6_0);
}(es), ClearSplitEffectStateMachine.Command.create_NoOp());
            } else {
              let _18_newClient = ClearSplitMultiCollaboration.__default.HandleRealtimeUpdate((es).dtor_client, _13_freshVersion, _14_freshModel);
              let _19_newState = ClearSplitEffectStateMachine.EffectState.create_EffectState((es).dtor_network, ClearSplitEffectStateMachine.EffectMode.create_Dispatching((_15_retries).plus(_dafny.ONE)), _18_newClient, _13_freshVersion);
              if (ClearSplitEffectStateMachine.__default.HasPending(_19_newState)) {
                return _dafny.Tuple.of(_19_newState, ClearSplitEffectStateMachine.Command.create_SendDispatch(_13_freshVersion, ClearSplitEffectStateMachine.__default.FirstPendingAction(_19_newState)));
              } else {
                return _dafny.Tuple.of(function (_pat_let8_0) {
  return function (_20_dt__update__tmp_h4) {
    return function (_pat_let9_0) {
      return function (_21_dt__update_hmode_h3) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_20_dt__update__tmp_h4).dtor_network, _21_dt__update_hmode_h3, (_20_dt__update__tmp_h4).dtor_client, (_20_dt__update__tmp_h4).dtor_serverVersion);
      }(_pat_let9_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let8_0);
}(_19_newState), ClearSplitEffectStateMachine.Command.create_NoOp());
              }
            }
          } else {
            return _dafny.Tuple.of(es, ClearSplitEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_DispatchRejected) {
          let _22_freshVersion = (_source0).freshVersion;
          let _23_freshModel = (_source0).freshModel;
          if (((es).dtor_mode).is_Dispatching) {
            let _24_newClient = ClearSplitMultiCollaboration.__default.ClientRejectReply((es).dtor_client, _22_freshVersion, _23_freshModel);
            let _25_newState = ClearSplitEffectStateMachine.EffectState.create_EffectState((es).dtor_network, ClearSplitEffectStateMachine.EffectMode.create_Idle(), _24_newClient, _22_freshVersion);
            if (ClearSplitEffectStateMachine.__default.CanStartDispatch(_25_newState)) {
              return _dafny.Tuple.of(function (_pat_let10_0) {
  return function (_26_dt__update__tmp_h5) {
    return function (_pat_let11_0) {
      return function (_27_dt__update_hmode_h4) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_26_dt__update__tmp_h5).dtor_network, _27_dt__update_hmode_h4, (_26_dt__update__tmp_h5).dtor_client, (_26_dt__update__tmp_h5).dtor_serverVersion);
      }(_pat_let11_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let10_0);
}(_25_newState), ClearSplitEffectStateMachine.Command.create_SendDispatch(ClearSplitMultiCollaboration.__default.ClientVersion((_25_newState).dtor_client), ClearSplitEffectStateMachine.__default.FirstPendingAction(_25_newState)));
            } else {
              return _dafny.Tuple.of(_25_newState, ClearSplitEffectStateMachine.Command.create_NoOp());
            }
          } else {
            return _dafny.Tuple.of(es, ClearSplitEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_NetworkError) {
          return _dafny.Tuple.of(function (_pat_let12_0) {
  return function (_28_dt__update__tmp_h6) {
    return function (_pat_let13_0) {
      return function (_29_dt__update_hmode_h5) {
        return function (_pat_let14_0) {
          return function (_30_dt__update_hnetwork_h0) {
            return ClearSplitEffectStateMachine.EffectState.create_EffectState(_30_dt__update_hnetwork_h0, _29_dt__update_hmode_h5, (_28_dt__update__tmp_h6).dtor_client, (_28_dt__update__tmp_h6).dtor_serverVersion);
          }(_pat_let14_0);
        }(ClearSplitEffectStateMachine.NetworkStatus.create_Offline());
      }(_pat_let13_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let12_0);
}(es), ClearSplitEffectStateMachine.Command.create_NoOp());
        }
      }
      {
        if (_source0.is_NetworkRestored) {
          let _31_newState = function (_pat_let15_0) {
            return function (_32_dt__update__tmp_h7) {
              return function (_pat_let16_0) {
                return function (_33_dt__update_hnetwork_h1) {
                  return ClearSplitEffectStateMachine.EffectState.create_EffectState(_33_dt__update_hnetwork_h1, (_32_dt__update__tmp_h7).dtor_mode, (_32_dt__update__tmp_h7).dtor_client, (_32_dt__update__tmp_h7).dtor_serverVersion);
                }(_pat_let16_0);
              }(ClearSplitEffectStateMachine.NetworkStatus.create_Online());
            }(_pat_let15_0);
          }(es);
          if (ClearSplitEffectStateMachine.__default.CanStartDispatch(_31_newState)) {
            return _dafny.Tuple.of(function (_pat_let17_0) {
  return function (_34_dt__update__tmp_h8) {
    return function (_pat_let18_0) {
      return function (_35_dt__update_hmode_h6) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_34_dt__update__tmp_h8).dtor_network, _35_dt__update_hmode_h6, (_34_dt__update__tmp_h8).dtor_client, (_34_dt__update__tmp_h8).dtor_serverVersion);
      }(_pat_let18_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let17_0);
}(_31_newState), ClearSplitEffectStateMachine.Command.create_SendDispatch(ClearSplitMultiCollaboration.__default.ClientVersion((_31_newState).dtor_client), ClearSplitEffectStateMachine.__default.FirstPendingAction(_31_newState)));
          } else {
            return _dafny.Tuple.of(_31_newState, ClearSplitEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (_source0.is_ManualGoOffline) {
          return _dafny.Tuple.of(function (_pat_let19_0) {
  return function (_36_dt__update__tmp_h9) {
    return function (_pat_let20_0) {
      return function (_37_dt__update_hmode_h7) {
        return function (_pat_let21_0) {
          return function (_38_dt__update_hnetwork_h2) {
            return ClearSplitEffectStateMachine.EffectState.create_EffectState(_38_dt__update_hnetwork_h2, _37_dt__update_hmode_h7, (_36_dt__update__tmp_h9).dtor_client, (_36_dt__update__tmp_h9).dtor_serverVersion);
          }(_pat_let21_0);
        }(ClearSplitEffectStateMachine.NetworkStatus.create_Offline());
      }(_pat_let20_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Idle());
  }(_pat_let19_0);
}(es), ClearSplitEffectStateMachine.Command.create_NoOp());
        }
      }
      {
        if (_source0.is_ManualGoOnline) {
          let _39_newState = function (_pat_let22_0) {
            return function (_40_dt__update__tmp_h10) {
              return function (_pat_let23_0) {
                return function (_41_dt__update_hnetwork_h3) {
                  return ClearSplitEffectStateMachine.EffectState.create_EffectState(_41_dt__update_hnetwork_h3, (_40_dt__update__tmp_h10).dtor_mode, (_40_dt__update__tmp_h10).dtor_client, (_40_dt__update__tmp_h10).dtor_serverVersion);
                }(_pat_let23_0);
              }(ClearSplitEffectStateMachine.NetworkStatus.create_Online());
            }(_pat_let22_0);
          }(es);
          if (ClearSplitEffectStateMachine.__default.CanStartDispatch(_39_newState)) {
            return _dafny.Tuple.of(function (_pat_let24_0) {
  return function (_42_dt__update__tmp_h11) {
    return function (_pat_let25_0) {
      return function (_43_dt__update_hmode_h8) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_42_dt__update__tmp_h11).dtor_network, _43_dt__update_hmode_h8, (_42_dt__update__tmp_h11).dtor_client, (_42_dt__update__tmp_h11).dtor_serverVersion);
      }(_pat_let25_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let24_0);
}(_39_newState), ClearSplitEffectStateMachine.Command.create_SendDispatch(ClearSplitMultiCollaboration.__default.ClientVersion((_39_newState).dtor_client), ClearSplitEffectStateMachine.__default.FirstPendingAction(_39_newState)));
          } else {
            return _dafny.Tuple.of(_39_newState, ClearSplitEffectStateMachine.Command.create_NoOp());
          }
        }
      }
      {
        if (ClearSplitEffectStateMachine.__default.CanStartDispatch(es)) {
          return _dafny.Tuple.of(function (_pat_let26_0) {
  return function (_44_dt__update__tmp_h12) {
    return function (_pat_let27_0) {
      return function (_45_dt__update_hmode_h9) {
        return ClearSplitEffectStateMachine.EffectState.create_EffectState((_44_dt__update__tmp_h12).dtor_network, _45_dt__update_hmode_h9, (_44_dt__update__tmp_h12).dtor_client, (_44_dt__update__tmp_h12).dtor_serverVersion);
      }(_pat_let27_0);
    }(ClearSplitEffectStateMachine.EffectMode.create_Dispatching(_dafny.ZERO));
  }(_pat_let26_0);
}(es), ClearSplitEffectStateMachine.Command.create_SendDispatch(ClearSplitMultiCollaboration.__default.ClientVersion((es).dtor_client), ClearSplitEffectStateMachine.__default.FirstPendingAction(es)));
        } else {
          return _dafny.Tuple.of(es, ClearSplitEffectStateMachine.Command.create_NoOp());
        }
      }
    };
    static ModeConsistent(es) {
      return !(((es).dtor_mode).is_Dispatching) || (ClearSplitEffectStateMachine.__default.HasPending(es));
    };
    static RetriesBounded(es) {
      return !(((es).dtor_mode).is_Dispatching) || ((((es).dtor_mode).dtor_retries).isLessThanOrEqualTo(ClearSplitEffectStateMachine.__default.MaxRetries));
    };
    static Inv(es) {
      return (ClearSplitEffectStateMachine.__default.ModeConsistent(es)) && (ClearSplitEffectStateMachine.__default.RetriesBounded(es));
    };
    static Pending(es) {
      return ((es).dtor_client).dtor_pending;
    };
    static ProgressMeasure(es) {
      return _dafny.Tuple.of(((es).dtor_mode).is_Dispatching, (((((es).dtor_mode).is_Dispatching) && ((((es).dtor_mode).dtor_retries).isLessThanOrEqualTo(ClearSplitEffectStateMachine.__default.MaxRetries))) ? ((ClearSplitEffectStateMachine.__default.MaxRetries).minus(((es).dtor_mode).dtor_retries)) : (_dafny.ZERO)), ClearSplitEffectStateMachine.__default.PendingCount(es));
    };
    static ProgressLt(m1, m2) {
      return ((((m1)[2]).isLessThan((m2)[2])) || (((((m1)[2]).isEqualTo((m2)[2])) && (!((m1)[0]))) && ((m2)[0]))) || (((((m1)[2]).isEqualTo((m2)[2])) && (((m1)[0]) === ((m2)[0]))) && (((m1)[1]).isLessThan((m2)[1])));
    };
    static Init(version, model) {
      return ClearSplitEffectStateMachine.EffectState.create_EffectState(ClearSplitEffectStateMachine.NetworkStatus.create_Online(), ClearSplitEffectStateMachine.EffectMode.create_Idle(), ClearSplitMultiCollaboration.__default.InitClient(version, model), version);
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
        return "ClearSplitEffectStateMachine.NetworkStatus.Online";
      } else if (this.$tag === 1) {
        return "ClearSplitEffectStateMachine.NetworkStatus.Offline";
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
      return ClearSplitEffectStateMachine.NetworkStatus.create_Online();
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
        return "ClearSplitEffectStateMachine.EffectMode.Idle";
      } else if (this.$tag === 1) {
        return "ClearSplitEffectStateMachine.EffectMode.Dispatching" + "(" + _dafny.toString(this.retries) + ")";
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
      return ClearSplitEffectStateMachine.EffectMode.create_Idle();
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
        return "ClearSplitEffectStateMachine.EffectState.EffectState" + "(" + _dafny.toString(this.network) + ", " + _dafny.toString(this.mode) + ", " + _dafny.toString(this.client) + ", " + _dafny.toString(this.serverVersion) + ")";
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
      return ClearSplitEffectStateMachine.EffectState.create_EffectState(ClearSplitEffectStateMachine.NetworkStatus.Default(), ClearSplitEffectStateMachine.EffectMode.Default(), ClearSplitMultiCollaboration.ClientState.Default(), _dafny.ZERO);
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
        return "ClearSplitEffectStateMachine.Event.UserAction" + "(" + _dafny.toString(this.action) + ")";
      } else if (this.$tag === 1) {
        return "ClearSplitEffectStateMachine.Event.DispatchAccepted" + "(" + _dafny.toString(this.newVersion) + ", " + _dafny.toString(this.newModel) + ")";
      } else if (this.$tag === 2) {
        return "ClearSplitEffectStateMachine.Event.DispatchConflict" + "(" + _dafny.toString(this.freshVersion) + ", " + _dafny.toString(this.freshModel) + ")";
      } else if (this.$tag === 3) {
        return "ClearSplitEffectStateMachine.Event.DispatchRejected" + "(" + _dafny.toString(this.freshVersion) + ", " + _dafny.toString(this.freshModel) + ")";
      } else if (this.$tag === 4) {
        return "ClearSplitEffectStateMachine.Event.NetworkError";
      } else if (this.$tag === 5) {
        return "ClearSplitEffectStateMachine.Event.NetworkRestored";
      } else if (this.$tag === 6) {
        return "ClearSplitEffectStateMachine.Event.ManualGoOffline";
      } else if (this.$tag === 7) {
        return "ClearSplitEffectStateMachine.Event.ManualGoOnline";
      } else if (this.$tag === 8) {
        return "ClearSplitEffectStateMachine.Event.Tick";
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
      return ClearSplitEffectStateMachine.Event.create_UserAction(ClearSplitDomain.Action.Default());
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
        return "ClearSplitEffectStateMachine.Command.NoOp";
      } else if (this.$tag === 1) {
        return "ClearSplitEffectStateMachine.Command.SendDispatch" + "(" + _dafny.toString(this.baseVersion) + ", " + _dafny.toString(this.action) + ")";
      } else if (this.$tag === 2) {
        return "ClearSplitEffectStateMachine.Command.FetchFreshState";
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
      return ClearSplitEffectStateMachine.Command.create_NoOp();
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
})(); // end of module ClearSplitEffectStateMachine
let ClearSplitCrossGroup = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitCrossGroup._default";
    }
    _parentTraits() {
      return [];
    }
    static GetGroupBalance(entry) {
      let _0_balance = ClearSplit.__default.GetBalance((entry).dtor_model, (entry).dtor_displayName);
      return ClearSplitCrossGroup.GroupBalance.create_GroupBalance((entry).dtor_groupName, _0_balance);
    };
    static ComputeGroupBalances(groups) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((groups).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of());
        } else {
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of(ClearSplitCrossGroup.__default.GetGroupBalance((groups)[_dafny.ZERO])));
          let _in0 = (groups).slice(_dafny.ONE);
          groups = _in0;
          continue TAIL_CALL_START;
        }
      }
    };
    static SumPositive(balances) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((balances).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          let _1_b = ((balances)[_dafny.ZERO]).dtor_balance;
          _0___accumulator = (_0___accumulator).plus((((_dafny.ZERO).isLessThan(_1_b)) ? (_1_b) : (_dafny.ZERO)));
          let _in0 = (balances).slice(_dafny.ONE);
          balances = _in0;
          continue TAIL_CALL_START;
        }
      }
    };
    static SumNegative(balances) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((balances).length)).isEqualTo(_dafny.ZERO)) {
          return (_dafny.ZERO).plus(_0___accumulator);
        } else {
          let _1_b = ((balances)[_dafny.ZERO]).dtor_balance;
          _0___accumulator = (_0___accumulator).plus((((_1_b).isLessThan(_dafny.ZERO)) ? ((_dafny.ZERO).minus(_1_b)) : (_dafny.ZERO)));
          let _in0 = (balances).slice(_dafny.ONE);
          balances = _in0;
          continue TAIL_CALL_START;
        }
      }
    };
    static ComputeCrossGroupSummary(groups) {
      let _0_balances = ClearSplitCrossGroup.__default.ComputeGroupBalances(groups);
      let _1_totalOwed = ClearSplitCrossGroup.__default.SumPositive(_0_balances);
      let _2_totalOwes = ClearSplitCrossGroup.__default.SumNegative(_0_balances);
      return ClearSplitCrossGroup.CrossGroupSummary.create_CrossGroupSummary(_1_totalOwed, _2_totalOwes, (_1_totalOwed).minus(_2_totalOwes), _0_balances);
    };
  };

  $module.GroupEntry = class GroupEntry {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_GroupEntry(groupName, displayName, model) {
      let $dt = new GroupEntry(0);
      $dt.groupName = groupName;
      $dt.displayName = displayName;
      $dt.model = model;
      return $dt;
    }
    get is_GroupEntry() { return this.$tag === 0; }
    get dtor_groupName() { return this.groupName; }
    get dtor_displayName() { return this.displayName; }
    get dtor_model() { return this.model; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplitCrossGroup.GroupEntry.GroupEntry" + "(" + this.groupName.toVerbatimString(true) + ", " + this.displayName.toVerbatimString(true) + ", " + _dafny.toString(this.model) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.groupName, other.groupName) && _dafny.areEqual(this.displayName, other.displayName) && _dafny.areEqual(this.model, other.model);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplitCrossGroup.GroupEntry.create_GroupEntry(_dafny.Seq.UnicodeFromString(""), _dafny.Seq.UnicodeFromString(""), ClearSplit.Model.Default());
    }
    static Rtd() {
      return class {
        static get Default() {
          return GroupEntry.Default();
        }
      };
    }
  }

  $module.GroupBalance = class GroupBalance {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_GroupBalance(groupName, balance) {
      let $dt = new GroupBalance(0);
      $dt.groupName = groupName;
      $dt.balance = balance;
      return $dt;
    }
    get is_GroupBalance() { return this.$tag === 0; }
    get dtor_groupName() { return this.groupName; }
    get dtor_balance() { return this.balance; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplitCrossGroup.GroupBalance.GroupBalance" + "(" + this.groupName.toVerbatimString(true) + ", " + _dafny.toString(this.balance) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.groupName, other.groupName) && _dafny.areEqual(this.balance, other.balance);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplitCrossGroup.GroupBalance.create_GroupBalance(_dafny.Seq.UnicodeFromString(""), _dafny.ZERO);
    }
    static Rtd() {
      return class {
        static get Default() {
          return GroupBalance.Default();
        }
      };
    }
  }

  $module.CrossGroupSummary = class CrossGroupSummary {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_CrossGroupSummary(totalOwed, totalOwes, netBalance, groups) {
      let $dt = new CrossGroupSummary(0);
      $dt.totalOwed = totalOwed;
      $dt.totalOwes = totalOwes;
      $dt.netBalance = netBalance;
      $dt.groups = groups;
      return $dt;
    }
    get is_CrossGroupSummary() { return this.$tag === 0; }
    get dtor_totalOwed() { return this.totalOwed; }
    get dtor_totalOwes() { return this.totalOwes; }
    get dtor_netBalance() { return this.netBalance; }
    get dtor_groups() { return this.groups; }
    toString() {
      if (this.$tag === 0) {
        return "ClearSplitCrossGroup.CrossGroupSummary.CrossGroupSummary" + "(" + _dafny.toString(this.totalOwed) + ", " + _dafny.toString(this.totalOwes) + ", " + _dafny.toString(this.netBalance) + ", " + _dafny.toString(this.groups) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.totalOwed, other.totalOwed) && _dafny.areEqual(this.totalOwes, other.totalOwes) && _dafny.areEqual(this.netBalance, other.netBalance) && _dafny.areEqual(this.groups, other.groups);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return ClearSplitCrossGroup.CrossGroupSummary.create_CrossGroupSummary(_dafny.ZERO, _dafny.ZERO, _dafny.ZERO, _dafny.Seq.of());
    }
    static Rtd() {
      return class {
        static get Default() {
          return CrossGroupSummary.Default();
        }
      };
    }
  }
  return $module;
})(); // end of module ClearSplitCrossGroup
let ClearSplitMultiAppCore = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitMultiAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static InitServerWithMembers(memberList) {
      let _0_members = function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of _dafny.IntegerRange(_dafny.ZERO, new BigNumber((memberList).length))) {
          let _1_i = _compr_0;
          if (((_dafny.ZERO).isLessThanOrEqualTo(_1_i)) && ((_1_i).isLessThan(new BigNumber((memberList).length)))) {
            _coll0.add((memberList)[_1_i]);
          }
        }
        return _coll0;
      }();
      let _2_model = ClearSplit.Model.create_Model(_0_members, memberList, _dafny.Seq.of(), _dafny.Seq.of());
      return ClearSplitMultiCollaboration.ServerState.create_ServerState(_2_model, _dafny.Seq.of(), _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return ClearSplitMultiCollaboration.__default.InitClientFromServer(server);
    };
    static InitClient(version, model) {
      return ClearSplitMultiCollaboration.__default.InitClient(version, model);
    };
    static MakeExpense(paidBy, amount, shares, shareKeys) {
      return ClearSplit.Expense.create_Expense(paidBy, amount, shares, shareKeys);
    };
    static MakeSettlement(from, to, amount) {
      return ClearSplit.Settlement.create_Settlement(from, to, amount);
    };
    static AddExpense(e) {
      return ClearSplitDomain.Action.create_AddExpense(e);
    };
    static AddSettlement(s) {
      return ClearSplitDomain.Action.create_AddSettlement(s);
    };
    static ClientLocalDispatch(client, action) {
      return ClearSplitMultiCollaboration.__default.ClientLocalDispatch(client, action);
    };
    static HandleRealtimeUpdate(client, serverVersion, serverModel) {
      return ClearSplitMultiCollaboration.__default.HandleRealtimeUpdate(client, serverVersion, serverModel);
    };
    static ClientAcceptReply(client, newVersion, newPresent) {
      return ClearSplitMultiCollaboration.__default.ClientAcceptReply(client, newVersion, newPresent);
    };
    static ClientRejectReply(client, freshVersion, freshModel) {
      return ClearSplitMultiCollaboration.__default.ClientRejectReply(client, freshVersion, freshModel);
    };
    static ServerDispatch(server, baseVersion, action) {
      return ClearSplitMultiCollaboration.__default.Dispatch(server, baseVersion, action);
    };
    static ServerVersion(server) {
      return ClearSplitMultiCollaboration.__default.Version(server);
    };
    static ClientModel(client) {
      return ClearSplitMultiCollaboration.__default.ClientModel(client);
    };
    static ClientVersion(client) {
      return ClearSplitMultiCollaboration.__default.ClientVersion(client);
    };
    static PendingCount(client) {
      return ClearSplitMultiCollaboration.__default.PendingCount(client);
    };
    static IsAccepted(reply) {
      return (reply).is_Accepted;
    };
    static IsRejected(reply) {
      return (reply).is_Rejected;
    };
    static Balances(model) {
      return ClearSplit.__default.Balances(model);
    };
    static GetBalance(model, p) {
      return ClearSplit.__default.GetBalance(model, p);
    };
    static Members(model) {
      return (model).dtor_memberList;
    };
    static Expenses(model) {
      return (model).dtor_expenses;
    };
    static Settlements(model) {
      return (model).dtor_settlements;
    };
    static GetFirstPending(client) {
      return ((client).dtor_pending)[_dafny.ZERO];
    };
    static HasPending(client) {
      return (_dafny.ZERO).isLessThan(new BigNumber(((client).dtor_pending).length));
    };
  };
  return $module;
})(); // end of module ClearSplitMultiAppCore
let ClearSplitEffectAppCore = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitEffectAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static EffectInit(version, model) {
      return ClearSplitEffectStateMachine.__default.Init(version, model);
    };
    static EffectStep(es, event) {
      return ClearSplitEffectStateMachine.__default.Step(es, event);
    };
    static EffectIsOnline(es) {
      return ClearSplitEffectStateMachine.__default.IsOnline(es);
    };
    static EffectIsIdle(es) {
      return ClearSplitEffectStateMachine.__default.IsIdle(es);
    };
    static EffectHasPending(es) {
      return ClearSplitEffectStateMachine.__default.HasPending(es);
    };
    static EffectPendingCount(es) {
      return ClearSplitEffectStateMachine.__default.PendingCount(es);
    };
    static EffectGetClient(es) {
      return (es).dtor_client;
    };
    static EffectGetServerVersion(es) {
      return (es).dtor_serverVersion;
    };
    static EffectUserAction(action) {
      return ClearSplitEffectStateMachine.Event.create_UserAction(action);
    };
    static EffectDispatchAccepted(version, model) {
      return ClearSplitEffectStateMachine.Event.create_DispatchAccepted(version, model);
    };
    static EffectDispatchConflict(version, model) {
      return ClearSplitEffectStateMachine.Event.create_DispatchConflict(version, model);
    };
    static EffectDispatchRejected(version, model) {
      return ClearSplitEffectStateMachine.Event.create_DispatchRejected(version, model);
    };
    static EffectNetworkError() {
      return ClearSplitEffectStateMachine.Event.create_NetworkError();
    };
    static EffectNetworkRestored() {
      return ClearSplitEffectStateMachine.Event.create_NetworkRestored();
    };
    static EffectManualGoOffline() {
      return ClearSplitEffectStateMachine.Event.create_ManualGoOffline();
    };
    static EffectManualGoOnline() {
      return ClearSplitEffectStateMachine.Event.create_ManualGoOnline();
    };
    static EffectTick() {
      return ClearSplitEffectStateMachine.Event.create_Tick();
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
    static MakeGroupEntry(groupName, displayName, model) {
      return ClearSplitCrossGroup.GroupEntry.create_GroupEntry(groupName, displayName, model);
    };
    static ComputeCrossGroupSummary(groups) {
      return ClearSplitCrossGroup.__default.ComputeCrossGroupSummary(groups);
    };
    static GetTotalOwed(summary) {
      return (summary).dtor_totalOwed;
    };
    static GetTotalOwes(summary) {
      return (summary).dtor_totalOwes;
    };
    static GetNetBalance(summary) {
      return (summary).dtor_netBalance;
    };
    static GetGroupBalances(summary) {
      return (summary).dtor_groups;
    };
    static GetGroupBalanceName(gb) {
      return (gb).dtor_groupName;
    };
    static GetGroupBalanceAmount(gb) {
      return (gb).dtor_balance;
    };
    static InitServerWithMembers(memberList) {
      let _0_members = function () {
        let _coll0 = new _dafny.Set();
        for (const _compr_0 of _dafny.IntegerRange(_dafny.ZERO, new BigNumber((memberList).length))) {
          let _1_i = _compr_0;
          if (((_dafny.ZERO).isLessThanOrEqualTo(_1_i)) && ((_1_i).isLessThan(new BigNumber((memberList).length)))) {
            _coll0.add((memberList)[_1_i]);
          }
        }
        return _coll0;
      }();
      let _2_model = ClearSplit.Model.create_Model(_0_members, memberList, _dafny.Seq.of(), _dafny.Seq.of());
      return ClearSplitMultiCollaboration.ServerState.create_ServerState(_2_model, _dafny.Seq.of(), _dafny.Seq.of());
    };
    static InitClientFromServer(server) {
      return ClearSplitMultiCollaboration.__default.InitClientFromServer(server);
    };
    static InitClient(version, model) {
      return ClearSplitMultiCollaboration.__default.InitClient(version, model);
    };
    static MakeExpense(paidBy, amount, shares, shareKeys) {
      return ClearSplit.Expense.create_Expense(paidBy, amount, shares, shareKeys);
    };
    static MakeSettlement(from, to, amount) {
      return ClearSplit.Settlement.create_Settlement(from, to, amount);
    };
    static AddExpense(e) {
      return ClearSplitDomain.Action.create_AddExpense(e);
    };
    static AddSettlement(s) {
      return ClearSplitDomain.Action.create_AddSettlement(s);
    };
    static ClientLocalDispatch(client, action) {
      return ClearSplitMultiCollaboration.__default.ClientLocalDispatch(client, action);
    };
    static HandleRealtimeUpdate(client, serverVersion, serverModel) {
      return ClearSplitMultiCollaboration.__default.HandleRealtimeUpdate(client, serverVersion, serverModel);
    };
    static ClientAcceptReply(client, newVersion, newPresent) {
      return ClearSplitMultiCollaboration.__default.ClientAcceptReply(client, newVersion, newPresent);
    };
    static ClientRejectReply(client, freshVersion, freshModel) {
      return ClearSplitMultiCollaboration.__default.ClientRejectReply(client, freshVersion, freshModel);
    };
    static ServerDispatch(server, baseVersion, action) {
      return ClearSplitMultiCollaboration.__default.Dispatch(server, baseVersion, action);
    };
    static ServerVersion(server) {
      return ClearSplitMultiCollaboration.__default.Version(server);
    };
    static ClientModel(client) {
      return ClearSplitMultiCollaboration.__default.ClientModel(client);
    };
    static ClientVersion(client) {
      return ClearSplitMultiCollaboration.__default.ClientVersion(client);
    };
    static PendingCount(client) {
      return ClearSplitMultiCollaboration.__default.PendingCount(client);
    };
    static IsAccepted(reply) {
      return (reply).is_Accepted;
    };
    static IsRejected(reply) {
      return (reply).is_Rejected;
    };
    static Balances(model) {
      return ClearSplit.__default.Balances(model);
    };
    static GetBalance(model, p) {
      return ClearSplit.__default.GetBalance(model, p);
    };
    static Members(model) {
      return (model).dtor_memberList;
    };
    static Expenses(model) {
      return (model).dtor_expenses;
    };
    static Settlements(model) {
      return (model).dtor_settlements;
    };
    static GetFirstPending(client) {
      return ((client).dtor_pending)[_dafny.ZERO];
    };
    static HasPending(client) {
      return (_dafny.ZERO).isLessThan(new BigNumber(((client).dtor_pending).length));
    };
  };
  return $module;
})(); // end of module ClearSplitEffectAppCore
let ClearSplitAppCore = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ClearSplitAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static Init(memberList) {
      let result = ClearSplit.Result.Default(ClearSplit.Model.Default());
      let _out0;
      _out0 = ClearSplit.__default.Init(memberList);
      result = _out0;
      return result;
    }
    static AddExpense(e) {
      return ClearSplit.Action.create_AddExpense(e);
    };
    static AddSettlement(s) {
      return ClearSplit.Action.create_AddSettlement(s);
    };
    static MakeExpense(paidBy, amount, shares, shareKeys) {
      return ClearSplit.Expense.create_Expense(paidBy, amount, shares, shareKeys);
    };
    static MakeSettlement(from, to, amount) {
      return ClearSplit.Settlement.create_Settlement(from, to, amount);
    };
    static Dispatch(model, a) {
      let result = ClearSplit.Result.Default(ClearSplit.Model.Default());
      let _out0;
      _out0 = ClearSplit.__default.Step(model, a);
      result = _out0;
      return result;
    }
    static Balances(model) {
      return ClearSplit.__default.Balances(model);
    };
    static GetBalance(model, p) {
      return ClearSplit.__default.GetBalance(model, p);
    };
    static Members(model) {
      return (model).dtor_memberList;
    };
    static Expenses(model) {
      return (model).dtor_expenses;
    };
    static Settlements(model) {
      return (model).dtor_settlements;
    };
    static GetCertificate(model) {
      let cert = ClearSplit.Certificate.Default();
      let _out0;
      _out0 = ClearSplit.__default.GetCertificate(model);
      cert = _out0;
      return cert;
    }
  };
  return $module;
})(); // end of module ClearSplitAppCore
let _module = (function() {
  let $module = {};

  return $module;
})(); // end of module _module
