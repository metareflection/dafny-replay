// Dafny program KanbanDomain.dfy compiled into JavaScript
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
let KanbanDomain = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "KanbanDomain._default";
    }
    _parentTraits() {
      return [];
    }
    static get(s, c, _$$_default) {
      if ((s).contains(c)) {
        return (s).get(c);
      } else {
        return _$$_default;
      }
    };
    static Lane(lanes, c) {
      return KanbanDomain.__default.get(lanes, c, _dafny.Seq.of());
    };
    static Wip(wip, c) {
      return KanbanDomain.__default.get(wip, c, _dafny.ZERO);
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
    static FlatColsPosition(cols, lanes, c, i) {
      let _0___accumulator = _dafny.ZERO;
      TAIL_CALL_START: while (true) {
        if ((c).isEqualTo(_dafny.ZERO)) {
          return (i).plus(_0___accumulator);
        } else {
          _0___accumulator = (_0___accumulator).plus(new BigNumber((KanbanDomain.__default.Lane(lanes, (cols)[_dafny.ZERO])).length));
          let _in0 = (cols).slice(_dafny.ONE);
          let _in1 = lanes;
          let _in2 = (c).minus(_dafny.ONE);
          let _in3 = i;
          cols = _in0;
          lanes = _in1;
          c = _in2;
          i = _in3;
          continue TAIL_CALL_START;
        }
      }
    };
    static AllIds(m) {
      let _source0 = m;
      {
        let _0_cols = (_source0).cols;
        let _1_lanes = (_source0).lanes;
        let _2_wip = (_source0).wip;
        let _3_cards = (_source0).cards;
        let _4_nextId = (_source0).nextId;
        return KanbanDomain.__default.FlattenCols(_0_cols, _1_lanes);
      }
    };
    static FlattenCols(cols, lanes) {
      let _0___accumulator = _dafny.Seq.of();
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cols).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.Concat(_0___accumulator, _dafny.Seq.of());
        } else {
          _0___accumulator = _dafny.Seq.Concat(_0___accumulator, KanbanDomain.__default.Lane(lanes, (cols)[_dafny.ZERO]));
          let _in0 = (cols).slice(_dafny.ONE);
          let _in1 = lanes;
          cols = _in0;
          lanes = _in1;
          continue TAIL_CALL_START;
        }
      }
    };
    static OccursInLanes(m, id) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(((m).dtor_cols).length)), false, function (_exists_var_0) {
        let _0_i = _exists_var_0;
        return (((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber(((m).dtor_cols).length)))) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((KanbanDomain.__default.Lane((m).dtor_lanes, ((m).dtor_cols)[_0_i])).length)), false, function (_exists_var_1) {
          let _1_j = _exists_var_1;
          return (((_dafny.ZERO).isLessThanOrEqualTo(_1_j)) && ((_1_j).isLessThan(new BigNumber((KanbanDomain.__default.Lane((m).dtor_lanes, ((m).dtor_cols)[_0_i])).length)))) && (((KanbanDomain.__default.Lane((m).dtor_lanes, ((m).dtor_cols)[_0_i]))[_1_j]).isEqualTo(id));
        }));
      });
    };
    static Init() {
      return KanbanDomain.Model.create_Model(_dafny.Seq.of(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.Map.Empty.slice(), _dafny.ZERO);
    };
    static Normalize(m) {
      return m;
    };
    static Apply(m, a) {
      let _source0 = m;
      {
        let _0_cols = (_source0).cols;
        let _1_lanes = (_source0).lanes;
        let _2_wip = (_source0).wip;
        let _3_cards = (_source0).cards;
        let _4_nextId = (_source0).nextId;
        let _source1 = a;
        {
          if (_source1.is_AddColumn) {
            let _5_col = (_source1).col;
            let _6_limit = (_source1).limit;
            if (_dafny.Seq.contains(_0_cols, _5_col)) {
              return m;
            } else {
              return KanbanDomain.Model.create_Model(_dafny.Seq.Concat(_0_cols, _dafny.Seq.of(_5_col)), (_1_lanes).update(_5_col, _dafny.Seq.of()), (_2_wip).update(_5_col, _6_limit), _3_cards, _4_nextId);
            }
          }
        }
        {
          if (_source1.is_SetWip) {
            let _7_col = (_source1).col;
            let _8_limit = (_source1).limit;
            if (!(_dafny.Seq.contains(_0_cols, _7_col))) {
              return m;
            } else if ((_8_limit).isLessThan(new BigNumber((KanbanDomain.__default.Lane(_1_lanes, _7_col)).length))) {
              return m;
            } else {
              return KanbanDomain.Model.create_Model(_0_cols, _1_lanes, (_2_wip).update(_7_col, _8_limit), _3_cards, _4_nextId);
            }
          }
        }
        {
          if (_source1.is_AddCard) {
            let _9_col = (_source1).col;
            let _10_title = (_source1).title;
            if (!(_dafny.Seq.contains(_0_cols, _9_col))) {
              return m;
            } else if ((KanbanDomain.__default.Wip(_2_wip, _9_col)).isLessThan((new BigNumber((KanbanDomain.__default.Lane(_1_lanes, _9_col)).length)).plus(_dafny.ONE))) {
              return m;
            } else {
              let _11_id = _4_nextId;
              return KanbanDomain.Model.create_Model(_0_cols, (_1_lanes).update(_9_col, _dafny.Seq.Concat(KanbanDomain.__default.Lane(_1_lanes, _9_col), _dafny.Seq.of(_11_id))), _2_wip, (_3_cards).update(_11_id, _10_title), (_4_nextId).plus(_dafny.ONE));
            }
          }
        }
        {
          let _12_id = (_source1).id;
          let _13_toCol = (_source1).toCol;
          let _14_pos = (_source1).pos;
          if (!(_dafny.Seq.contains(_0_cols, _13_toCol))) {
            return m;
          } else if (!((_3_cards).contains(_12_id))) {
            return m;
          } else {
            let _15_src = KanbanDomain.__default.FindColumnOf(_0_cols, _1_lanes, _12_id);
            if (_dafny.areEqual(_15_src, _dafny.Seq.UnicodeFromString(""))) {
              return m;
            } else if (_dafny.areEqual(_15_src, _13_toCol)) {
              let _16_s = KanbanDomain.__default.Lane(_1_lanes, _15_src);
              let _17_s1 = KanbanDomain.__default.RemoveFirst(_16_s, _12_id);
              let _18_k = KanbanDomain.__default.ClampPos(_14_pos, new BigNumber((_17_s1).length));
              return KanbanDomain.Model.create_Model(_0_cols, (_1_lanes).update(_15_src, KanbanDomain.__default.InsertAt(_17_s1, _18_k, _12_id)), _2_wip, _3_cards, _4_nextId);
            } else if ((KanbanDomain.__default.Wip(_2_wip, _13_toCol)).isLessThan((new BigNumber((KanbanDomain.__default.Lane(_1_lanes, _13_toCol)).length)).plus(_dafny.ONE))) {
              return m;
            } else {
              let _19_s = KanbanDomain.__default.Lane(_1_lanes, _15_src);
              let _20_t = KanbanDomain.__default.Lane(_1_lanes, _13_toCol);
              let _21_s1 = KanbanDomain.__default.RemoveFirst(_19_s, _12_id);
              let _22_k = KanbanDomain.__default.ClampPos(_14_pos, new BigNumber((_20_t).length));
              let _23_t1 = KanbanDomain.__default.InsertAt(_20_t, _22_k, _12_id);
              return KanbanDomain.Model.create_Model(_0_cols, ((_1_lanes).update(_15_src, _21_s1)).update(_13_toCol, _23_t1), _2_wip, _3_cards, _4_nextId);
            }
          }
        }
      }
    };
    static FindColumnOf(cols, lanes, id) {
      TAIL_CALL_START: while (true) {
        if ((new BigNumber((cols).length)).isEqualTo(_dafny.ZERO)) {
          return _dafny.Seq.UnicodeFromString("");
        } else if (KanbanDomain.__default.SeqContains(KanbanDomain.__default.Lane(lanes, (cols)[_dafny.ZERO]), id)) {
          return (cols)[_dafny.ZERO];
        } else {
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
    static SeqContains(s, x) {
      return _dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber((s).length)), false, function (_exists_var_0) {
        let _0_i = _exists_var_0;
        return (((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber((s).length)))) && (_dafny.areEqual((s)[_0_i], x));
      });
    };
  };

  $module.Card = class Card {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Card(title) {
      let $dt = new Card(0);
      $dt.title = title;
      return $dt;
    }
    get is_Card() { return this.$tag === 0; }
    get dtor_title() { return this.title; }
    toString() {
      if (this.$tag === 0) {
        return "KanbanDomain.Card.Card" + "(" + this.title.toVerbatimString(true) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.title, other.title);
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

  $module.Model = class Model {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Model(cols, lanes, wip, cards, nextId) {
      let $dt = new Model(0);
      $dt.cols = cols;
      $dt.lanes = lanes;
      $dt.wip = wip;
      $dt.cards = cards;
      $dt.nextId = nextId;
      return $dt;
    }
    get is_Model() { return this.$tag === 0; }
    get dtor_cols() { return this.cols; }
    get dtor_lanes() { return this.lanes; }
    get dtor_wip() { return this.wip; }
    get dtor_cards() { return this.cards; }
    get dtor_nextId() { return this.nextId; }
    toString() {
      if (this.$tag === 0) {
        return "KanbanDomain.Model.Model" + "(" + _dafny.toString(this.cols) + ", " + _dafny.toString(this.lanes) + ", " + _dafny.toString(this.wip) + ", " + _dafny.toString(this.cards) + ", " + _dafny.toString(this.nextId) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.cols, other.cols) && _dafny.areEqual(this.lanes, other.lanes) && _dafny.areEqual(this.wip, other.wip) && _dafny.areEqual(this.cards, other.cards) && _dafny.areEqual(this.nextId, other.nextId);
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

  $module.Action = class Action {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_AddColumn(col, limit) {
      let $dt = new Action(0);
      $dt.col = col;
      $dt.limit = limit;
      return $dt;
    }
    static create_SetWip(col, limit) {
      let $dt = new Action(1);
      $dt.col = col;
      $dt.limit = limit;
      return $dt;
    }
    static create_AddCard(col, title) {
      let $dt = new Action(2);
      $dt.col = col;
      $dt.title = title;
      return $dt;
    }
    static create_MoveCard(id, toCol, pos) {
      let $dt = new Action(3);
      $dt.id = id;
      $dt.toCol = toCol;
      $dt.pos = pos;
      return $dt;
    }
    get is_AddColumn() { return this.$tag === 0; }
    get is_SetWip() { return this.$tag === 1; }
    get is_AddCard() { return this.$tag === 2; }
    get is_MoveCard() { return this.$tag === 3; }
    get dtor_col() { return this.col; }
    get dtor_limit() { return this.limit; }
    get dtor_title() { return this.title; }
    get dtor_id() { return this.id; }
    get dtor_toCol() { return this.toCol; }
    get dtor_pos() { return this.pos; }
    toString() {
      if (this.$tag === 0) {
        return "KanbanDomain.Action.AddColumn" + "(" + this.col.toVerbatimString(true) + ", " + _dafny.toString(this.limit) + ")";
      } else if (this.$tag === 1) {
        return "KanbanDomain.Action.SetWip" + "(" + this.col.toVerbatimString(true) + ", " + _dafny.toString(this.limit) + ")";
      } else if (this.$tag === 2) {
        return "KanbanDomain.Action.AddCard" + "(" + this.col.toVerbatimString(true) + ", " + this.title.toVerbatimString(true) + ")";
      } else if (this.$tag === 3) {
        return "KanbanDomain.Action.MoveCard" + "(" + _dafny.toString(this.id) + ", " + this.toCol.toVerbatimString(true) + ", " + _dafny.toString(this.pos) + ")";
      } else  {
        return "<unexpected>";
      }
    }
    equals(other) {
      if (this === other) {
        return true;
      } else if (this.$tag === 0) {
        return other.$tag === 0 && _dafny.areEqual(this.col, other.col) && _dafny.areEqual(this.limit, other.limit);
      } else if (this.$tag === 1) {
        return other.$tag === 1 && _dafny.areEqual(this.col, other.col) && _dafny.areEqual(this.limit, other.limit);
      } else if (this.$tag === 2) {
        return other.$tag === 2 && _dafny.areEqual(this.col, other.col) && _dafny.areEqual(this.title, other.title);
      } else if (this.$tag === 3) {
        return other.$tag === 3 && _dafny.areEqual(this.id, other.id) && _dafny.areEqual(this.toCol, other.toCol) && _dafny.areEqual(this.pos, other.pos);
      } else  {
        return false; // unexpected
      }
    }
    static Default() {
      return KanbanDomain.Action.create_AddColumn(_dafny.Seq.UnicodeFromString(""), _dafny.ZERO);
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
})(); // end of module KanbanDomain
let KanbanKernel = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "KanbanKernel._default";
    }
    _parentTraits() {
      return [];
    }
    static Step(m, a) {
      return KanbanDomain.__default.Normalize(KanbanDomain.__default.Apply(m, a));
    };
    static InitHistory() {
      return KanbanKernel.History.create_History(_dafny.Seq.of(), KanbanDomain.__default.Init(), _dafny.Seq.of());
    };
    static Do(h, a) {
      return KanbanKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of((h).dtor_present)), KanbanKernel.__default.Step((h).dtor_present, a), _dafny.Seq.of());
    };
    static Undo(h) {
      if ((new BigNumber(((h).dtor_past).length)).isEqualTo(_dafny.ZERO)) {
        return h;
      } else {
        let _0_i = (new BigNumber(((h).dtor_past).length)).minus(_dafny.ONE);
        return KanbanKernel.History.create_History(((h).dtor_past).slice(0, _0_i), ((h).dtor_past)[_0_i], _dafny.Seq.Concat(_dafny.Seq.of((h).dtor_present), (h).dtor_future));
      }
    };
    static Redo(h) {
      if ((new BigNumber(((h).dtor_future).length)).isEqualTo(_dafny.ZERO)) {
        return h;
      } else {
        return KanbanKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of((h).dtor_present)), ((h).dtor_future)[_dafny.ZERO], ((h).dtor_future).slice(_dafny.ONE));
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
        return "KanbanKernel.History.History" + "(" + _dafny.toString(this.past) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.future) + ")";
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
      return KanbanKernel.History.create_History(_dafny.Seq.of(), KanbanDomain.Model.Default(), _dafny.Seq.of());
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
})(); // end of module KanbanKernel
let KanbanAppCore = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "KanbanAppCore._default";
    }
    _parentTraits() {
      return [];
    }
    static Init() {
      return KanbanKernel.__default.InitHistory();
    };
    static AddColumn(col, limit) {
      return KanbanDomain.Action.create_AddColumn(col, limit);
    };
    static SetWip(col, limit) {
      return KanbanDomain.Action.create_SetWip(col, limit);
    };
    static AddCard(col, title) {
      return KanbanDomain.Action.create_AddCard(col, title);
    };
    static MoveCard(id, toCol, pos) {
      return KanbanDomain.Action.create_MoveCard(id, toCol, pos);
    };
    static Dispatch(h, a) {
      return KanbanKernel.__default.Do(h, a);
    };
    static Undo(h) {
      return KanbanKernel.__default.Undo(h);
    };
    static Redo(h) {
      return KanbanKernel.__default.Redo(h);
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
    static GetCols(m) {
      return (m).dtor_cols;
    };
    static GetLane(m, col) {
      return KanbanDomain.__default.Lane((m).dtor_lanes, col);
    };
    static GetWip(m, col) {
      return KanbanDomain.__default.Wip((m).dtor_wip, col);
    };
    static GetCardTitle(m, id) {
      if (((m).dtor_cards).contains(id)) {
        return (((m).dtor_cards).get(id));
      } else {
        return _dafny.Seq.UnicodeFromString("");
      }
    };
  };
  return $module;
})(); // end of module KanbanAppCore
let _module = (function() {
  let $module = {};

  return $module;
})(); // end of module _module
