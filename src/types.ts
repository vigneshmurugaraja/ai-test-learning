export type AgentMode = 'api' | 'plan-only';

export interface CliArgs {
  feature?: string;
  url?: string;
  mode?: AgentMode;
  out?: string;
  help?: boolean;
  h?: boolean;
}

export interface QaScenario {
  title: string;
  objective: string;
}

export interface TestSkeleton {
  name: string;
  code: string;
}

export interface QaAnalysis {
  feature: string;
  mode: AgentMode;
  baseUrl?: string;
  scenarios: QaScenario[];
  edgeCases: string[];
  risks: string[];
  skeletons: TestSkeleton[];
}

export interface ApiCheck {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  expectedStatus: number;
  body?: Record<string, unknown>;
  validate?: (body: unknown) => boolean;
}

export interface ApiCheckResult {
  name: string;
  status: 'passed' | 'failed';
  method: ApiCheck['method'];
  path: string;
  expectedStatus: number;
  actualStatus: number | null;
  durationMs: number;
  body?: unknown;
  error?: string;
}

export interface UiElementSummary {
  role: 'input' | 'button' | 'link';
  label: string;
  selectorHint: string;
  visible: boolean;
}

export interface UiCheckResult {
  name: string;
  status: 'passed' | 'failed';
  detail: string;
}

export interface UiAgentReport {
  goal: string;
  targetUrl: string;
  finalUrl: string;
  title: string;
  elements: UiElementSummary[];
  checks: UiCheckResult[];
  screenshots: string[];
  suggestedTests: TestSkeleton[];
  risks: string[];
}
