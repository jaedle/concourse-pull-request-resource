export interface Source {
    repository: string;
    access_token: string;
}
export interface Version {
    pr: string;
    commit: string;
    committed: string;
}
export interface CheckInput {
    source: Source;
    version?: Version;
}
export interface GetInput {
    source: Source;
    version: Version;
    params?: Record<string, unknown>;
}
export interface Metadata {
    name: string;
    value: string;
}
export interface GetOutput {
    version: Version;
    metadata: Metadata[];
}
export interface PullRequestCommit {
    pr: number;
    commit: string;
    committed: string;
}
//# sourceMappingURL=types.d.ts.map