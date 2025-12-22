include "MultiCollaboration.dfy"

module KanbanDomain refines Domain {
    // ---- Types ----
    type CardId = nat
    type ColId  = string

    datatype Card = Card(title: string)

    // Immutable model (datatype, not class)
    datatype Model = Model(
        columns: map<ColId, seq<CardId>>,  // ordered card IDs per column
        wip: map<ColId, nat>,              // WIP limits per column
        cards: map<CardId, Card>           // card payloads
    )

    datatype Err =
        | MissingColumn
        | MissingCard
        | DuplicateCardId
        | WipExceeded
        | BadPos

    datatype Action =
        | NoOp
        | AddColumn(col: ColId, limit: nat)
        | DeleteColumn(col: ColId)
        | SetWip(col: ColId, limit: nat)
        | AddCard(col: ColId, id: CardId, pos: nat, title: string)
        | DeleteCard(id: CardId)
        | MoveCard(id: CardId, toCol: ColId, pos: nat)
        | EditTitle(id: CardId, title: string)

    // ---- Required API ----

    function NoOp(): Action { Action.NoOp }

    // Total OT transform (may yield NoOp).
    // LWW intuition: when both edit/move same target, keep local (since it is "later").
    function Transform(remote: Action, local: Action): Action
    {
        match remote
        case NoOp =>
            local

        case DeleteCard(rc) =>
            (match local
            case EditTitle(lc, _) =>
                if lc == rc then NoOp() else local
            case MoveCard(lc, _, _) =>
                if lc == rc then NoOp() else local
            case DeleteCard(lc) =>
                if lc == rc then NoOp() else local
            case _ =>
                local)

        case EditTitle(rc, _) =>
            (match local
            case EditTitle(lc, _) =>
                // LWW for same-card title edits: keep local
                local
            case _ =>
                local)

        case MoveCard(rc, _, _) =>
            (match local
            case MoveCard(lc, _, _) =>
                // LWW for same-card moves: keep local
                local
            case _ =>
                local)

        // TODO: Column deletion interactions, add-card interactions, etc.
        case _ =>
            local
    }

    // Global invariant — stub for now.
    // You’ll likely encode:
    //  (1) exact partition of cards across columns (no dupes, no missing)
    //  (2) referential integrity: ids in columns appear in cards
    //  (3) WIP respected: |columns[c]| <= wip[c]
    predicate Inv(m: Model)
    {
        true
    }

    // Semantic step — stub for now.
    // Replace with your real reducer:
    // - enforce referential integrity
    // - enforce WIP limits (Err(WipExceeded))
    // - allow identity steps (domain no-op)
    function TryStep(m: Model, a: Action): Result<Model, Err>
    {
        match a
        case NoOp =>
            Ok(m)

        // Placeholders; implement properly later.
        case _ =>
            Err(MissingColumn)
    }

    // Domain obligation.
    lemma StepPreservesInv(m: Model, a: Action, m2: Model)
    {
      // Trivial: Inv(m) == true for all m.
    }
}

module KanbanMultiCollaboration refines MultiCollaboration {
  import D = KanbanDomain
}
