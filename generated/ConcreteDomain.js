// Dafny program ConcreteDomain.dfy compiled into JavaScript
let ConcreteDomain = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ConcreteDomain._default";
    }
    _parentTraits() {
      return [];
    }
    static Inv(m) {
      return (_dafny.ZERO).isLessThanOrEqualTo(m);
    };
    static Apply(m, a) {
      let _source0 = a;
      {
        if (_source0.is_Inc) {
          return (m).plus(_dafny.ONE);
        }
      }
      {
        return (m).minus(_dafny.ONE);
      }
    };
    static Normalize(m) {
      if ((m).isLessThan(_dafny.ZERO)) {
        return _dafny.ZERO;
      } else {
        return m;
      }
    };
  };

  $module.Action = class Action {
    constructor(tag) {
      this.$tag = tag;
    }
    static create_Inc() {
      let $dt = new Action(0);
      return $dt;
    }
    static create_Dec() {
      let $dt = new Action(1);
      return $dt;
    }
    get is_Inc() { return this.$tag === 0; }
    get is_Dec() { return this.$tag === 1; }
    static get AllSingletonConstructors() {
      return this.AllSingletonConstructors_();
    }
    static *AllSingletonConstructors_() {
      yield Action.create_Inc();
      yield Action.create_Dec();
    }
    toString() {
      if (this.$tag === 0) {
        return "ConcreteDomain.Action.Inc";
      } else if (this.$tag === 1) {
        return "ConcreteDomain.Action.Dec";
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
      return ConcreteDomain.Action.create_Inc();
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
})(); // end of module ConcreteDomain
let ConcreteKernel = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "ConcreteKernel._default";
    }
    _parentTraits() {
      return [];
    }
    static Step(m, a) {
      return ConcreteDomain.__default.Normalize(ConcreteDomain.__default.Apply(m, a));
    };
    static Do(h, a) {
      return ConcreteKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of((h).dtor_present)), ConcreteKernel.__default.Step((h).dtor_present, a), _dafny.Seq.of());
    };
    static Undo(h) {
      if ((new BigNumber(((h).dtor_past).length)).isEqualTo(_dafny.ZERO)) {
        return h;
      } else {
        let _0_i = (new BigNumber(((h).dtor_past).length)).minus(_dafny.ONE);
        return ConcreteKernel.History.create_History(((h).dtor_past).slice(0, _0_i), ((h).dtor_past)[_0_i], _dafny.Seq.Concat(_dafny.Seq.of((h).dtor_present), (h).dtor_future));
      }
    };
    static Redo(h) {
      if ((new BigNumber(((h).dtor_future).length)).isEqualTo(_dafny.ZERO)) {
        return h;
      } else {
        return ConcreteKernel.History.create_History(_dafny.Seq.Concat((h).dtor_past, _dafny.Seq.of((h).dtor_present)), ((h).dtor_future)[_dafny.ZERO], ((h).dtor_future).slice(_dafny.ONE));
      }
    };
    static HistInv(h) {
      return ((_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(((h).dtor_past).length)), true, function (_forall_var_0) {
        let _0_i = _forall_var_0;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_0_i)) && ((_0_i).isLessThan(new BigNumber(((h).dtor_past).length)))) || (ConcreteDomain.__default.Inv(((h).dtor_past)[_0_i]));
      })) && (ConcreteDomain.__default.Inv((h).dtor_present))) && (_dafny.Quantifier(_dafny.IntegerRange(_dafny.ZERO, new BigNumber(((h).dtor_future).length)), true, function (_forall_var_1) {
        let _1_j = _forall_var_1;
        return !(((_dafny.ZERO).isLessThanOrEqualTo(_1_j)) && ((_1_j).isLessThan(new BigNumber(((h).dtor_future).length)))) || (ConcreteDomain.__default.Inv(((h).dtor_future)[_1_j]));
      }));
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
        return "ConcreteKernel.History.History" + "(" + _dafny.toString(this.past) + ", " + _dafny.toString(this.present) + ", " + _dafny.toString(this.future) + ")";
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
      return ConcreteKernel.History.create_History(_dafny.Seq.of(), _dafny.ZERO, _dafny.Seq.of());
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
})(); // end of module ConcreteKernel
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
      return ConcreteKernel.History.create_History(_dafny.Seq.of(), _dafny.ZERO, _dafny.Seq.of());
    };
    static Inc() {
      return ConcreteDomain.Action.create_Inc();
    };
    static Dec() {
      return ConcreteDomain.Action.create_Dec();
    };
    static Dispatch(h, a) {
      return ConcreteKernel.__default.Do(h, a);
    };
    static Undo(h) {
      return ConcreteKernel.__default.Undo(h);
    };
    static Redo(h) {
      return ConcreteKernel.__default.Redo(h);
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
let AppCoreTest = (function() {
  let $module = {};

  $module.__default = class __default {
    constructor () {
      this._tname = "AppCoreTest._default";
    }
    _parentTraits() {
      return [];
    }
    static Test() {
      let _0_h;
      _0_h = AppCore.__default.Init();
      _0_h = AppCore.__default.Dispatch(_0_h, ConcreteDomain.Action.create_Dec());
      _0_h = AppCore.__default.Dispatch(_0_h, ConcreteDomain.Action.create_Inc());
      _0_h = AppCore.__default.Undo(_0_h);
      _0_h = AppCore.__default.Redo(_0_h);
      return;
    }
  };
  return $module;
})(); // end of module AppCoreTest
let _module = (function() {
  let $module = {};

  return $module;
})(); // end of module _module
