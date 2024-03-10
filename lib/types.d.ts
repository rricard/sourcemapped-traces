export interface ProfileCallFrame {
  functionName: string;
  scriptId: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

export interface CpuProfileNode {
  id: number;
  callFrame: ProfileCallFrame;
  hitCount: number;
  children: number[];
}

export interface CpuProfile {
  nodes: CpuProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[];
}

export interface HeapNode {
  id: string;
  callFrame: ProfileCallFrame;
  selfSize: number;
  children: HeapNode[];
}

export interface HeapProfile {
  head: HeapNode;
}
