interface IPaRepository {
  getAll(): PeerAssessment[];
  findById(id: string): PeerAssessment | null;
  add(pa: PeerAssessment): void;
  setState(pa: PeerAssessment, newState: PaState): void;
}
