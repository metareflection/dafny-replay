// KanbanRealtimeCollaboration.dfy
// Kanban-specific instantiation of RealtimeCollaboration
// Provides verified flush/realtime coordination for Kanban domain

include "RealtimeCollaboration.dfy"
include "KanbanMultiCollaboration.dfy"

module KanbanRealtimeCollaboration refines RealtimeCollaboration {
  import MC = KanbanMultiCollaboration
}
