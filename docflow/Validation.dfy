module Validation {
  // A field value is either absent or a string
  datatype FieldValue = Absent | Value(s: string)

  // Constraint types
  datatype Constraint =
    | Required
    | MinLength(min: nat)
    | MaxLength(max: nat)
    | OneOf(allowed: seq<string>)
    | DependsOn(field: string, triggerValue: string)  // "if field X == triggerValue, then this field is required"

  // A rule binds a field name to a list of constraints
  datatype Rule = Rule(field: string, constraints: seq<Constraint>)

  // A validation error
  datatype ValidationError = ValidationError(field: string, message: string)

  // A form is a map from field names to values
  type Form = map<string, FieldValue>

  // --- Core validation logic ---

  // Check a single constraint against a field value
  predicate SatisfiesConstraint(form: Form, fieldName: string, value: FieldValue, c: Constraint) {
    match c
    case Required =>
      value.Value?
    case MinLength(min) =>
      value.Absent? || |value.s| >= min
    case MaxLength(max) =>
      value.Absent? || |value.s| <= max
    case OneOf(allowed) =>
      value.Absent? || value.s in allowed
    case DependsOn(depField, triggerValue) =>
      var depValue := if depField in form then form[depField] else Absent;
      // If the dependency field has the trigger value, this field is required
      !(depValue.Value? && depValue.s == triggerValue) || value.Value?
  }

  // Check all constraints for a single rule
  predicate SatisfiesRule(form: Form, rule: Rule) {
    var value := if rule.field in form then form[rule.field] else Absent;
    forall i :: 0 <= i < |rule.constraints| ==>
      SatisfiesConstraint(form, rule.field, value, rule.constraints[i])
  }

  // Validate all rules
  predicate IsValid(form: Form, rules: seq<Rule>) {
    forall i :: 0 <= i < |rules| ==> SatisfiesRule(form, rules[i])
  }

  // Collect errors for a single rule
  function ErrorsForRule(form: Form, rule: Rule): seq<ValidationError> {
    var value := if rule.field in form then form[rule.field] else Absent;
    ErrorsForConstraints(form, rule.field, value, rule.constraints)
  }

  function ErrorsForConstraints(form: Form, fieldName: string, value: FieldValue, constraints: seq<Constraint>): seq<ValidationError> {
    if |constraints| == 0 then []
    else
      var c := constraints[0];
      var rest := ErrorsForConstraints(form, fieldName, value, constraints[1..]);
      if SatisfiesConstraint(form, fieldName, value, c) then rest
      else [ValidationError(fieldName, ConstraintMessage(c))] + rest
  }

  function ConstraintMessage(c: Constraint): string {
    match c
    case Required => "Field is required"
    case MinLength(min) => "Too short"
    case MaxLength(max) => "Too long"
    case OneOf(_) => "Invalid value"
    case DependsOn(field, _) => "Required because of " + field
  }

  // Collect all errors
  function Validate(form: Form, rules: seq<Rule>): seq<ValidationError> {
    if |rules| == 0 then []
    else ErrorsForRule(form, rules[0]) + Validate(form, rules[1..])
  }

  // --- Helper lemmas ---

  lemma RuleSatisfiedIffNoErrors(form: Form, rule: Rule)
    ensures SatisfiesRule(form, rule) <==> |ErrorsForRule(form, rule)| == 0
  {
    var value := if rule.field in form then form[rule.field] else Absent;
    ConstraintsSatisfiedIffNoErrors(form, rule.field, value, rule.constraints);
  }

  lemma ConstraintsSatisfiedIffNoErrors(form: Form, fieldName: string, value: FieldValue, constraints: seq<Constraint>)
    ensures (forall i :: 0 <= i < |constraints| ==> SatisfiesConstraint(form, fieldName, value, constraints[i]))
            <==> |ErrorsForConstraints(form, fieldName, value, constraints)| == 0
  {
    if |constraints| == 0 {
    } else {
      ConstraintsSatisfiedIffNoErrors(form, fieldName, value, constraints[1..]);
      var c := constraints[0];
      var rest := ErrorsForConstraints(form, fieldName, value, constraints[1..]);
      if SatisfiesConstraint(form, fieldName, value, c) {
        forall i | 0 <= i < |constraints[1..]|
          ensures SatisfiesConstraint(form, fieldName, value, constraints[1..][i])
                  <==> SatisfiesConstraint(form, fieldName, value, constraints[i+1])
        {
          assert constraints[1..][i] == constraints[i+1];
        }
      } else {
      }
    }
  }

  // --- Spec lemmas ---

  // IsValid iff Validate returns empty
  lemma ValidIffNoErrors(form: Form, rules: seq<Rule>)
    ensures IsValid(form, rules) <==> |Validate(form, rules)| == 0
  {
    if |rules| == 0 {
    } else {
      RuleSatisfiedIffNoErrors(form, rules[0]);
      ValidIffNoErrors(form, rules[1..]);
      var headErrors := ErrorsForRule(form, rules[0]);
      var tailErrors := Validate(form, rules[1..]);
      assert |Validate(form, rules)| == |headErrors| + |tailErrors|;

      if IsValid(form, rules) {
        assert SatisfiesRule(form, rules[0]);
        forall i | 0 <= i < |rules[1..]|
          ensures SatisfiesRule(form, rules[1..][i])
        {
          assert rules[1..][i] == rules[i+1];
        }
        assert IsValid(form, rules[1..]);
      }
      if |Validate(form, rules)| == 0 {
        assert |headErrors| == 0;
        assert |tailErrors| == 0;
        assert SatisfiesRule(form, rules[0]);
        assert IsValid(form, rules[1..]);
        forall i | 0 <= i < |rules|
          ensures SatisfiesRule(form, rules[i])
        {
          if i == 0 {
          } else {
            assert rules[i] == rules[1..][i-1];
          }
        }
      }
    }
  }

  // Adding a Required constraint to an empty form always produces an error
  lemma RequiredFieldOnEmptyForm(fieldName: string, otherConstraints: seq<Constraint>)
    ensures !SatisfiesConstraint(map[], fieldName, Absent, Required)
  {
  }

  // Removing a constraint never introduces new errors
  // (if form is valid under rules ++ [extra], it's valid under rules)
  lemma FewerConstraintsFewerErrors(form: Form, rule: Rule, i: nat)
    requires i < |rule.constraints|
    requires SatisfiesRule(form, rule)
    ensures SatisfiesRule(form, Rule(rule.field, rule.constraints[..i] + rule.constraints[i+1..]))
  {
    var value := if rule.field in form then form[rule.field] else Absent;
    var fewer := rule.constraints[..i] + rule.constraints[i+1..];
    forall j | 0 <= j < |fewer|
      ensures SatisfiesConstraint(form, rule.field, value, fewer[j])
    {
      if j < i {
        assert fewer[j] == rule.constraints[j];
      } else {
        assert fewer[j] == rule.constraints[j+1];
      }
    }
  }

  // A form that satisfies all rules still satisfies them after removing a rule
  lemma FewerRulesStillValid(form: Form, rules: seq<Rule>, i: nat)
    requires i < |rules|
    requires IsValid(form, rules)
    ensures IsValid(form, rules[..i] + rules[i+1..])
  {
    var fewer := rules[..i] + rules[i+1..];
    forall j | 0 <= j < |fewer|
      ensures SatisfiesRule(form, fewer[j])
    {
      if j < i {
        assert fewer[j] == rules[j];
      } else {
        assert fewer[j] == rules[j+1];
      }
    }
  }

  // DependsOn: if the trigger field is absent, the constraint is satisfied
  lemma DependsOnAbsentTrigger(form: Form, fieldName: string, value: FieldValue, depField: string, triggerValue: string)
    requires depField !in form
    ensures SatisfiesConstraint(form, fieldName, value, DependsOn(depField, triggerValue))
  {
  }
}
