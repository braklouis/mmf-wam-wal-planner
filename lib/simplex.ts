export type SimplexStep = { iteration: number; entering: number; leaving: number; objective: number };
export type SolverTrace = { objective: number[]; matrix: number[][]; limits: number[]; labels: string[]; steps: SimplexStep[] };
const SIMPLEX_EPSILON = Number.EPSILON * 64;

// Primal simplex for max c'x subject to Ax <= b, x >= 0.
// All planner constraints have a non-negative right-hand side, so the slack
// variables provide an immediate feasible starting point.
export function simplex(
  objective: number[],
  matrix: number[][],
  limits: number[],
  onStep?: (step: SimplexStep) => void,
): number[] | null {
  const n = objective.length;
  const m = matrix.length;
  if (limits.length !== m) return null;
  for (let row = 0; row < m; row += 1) {
    const rowData = matrix[row];
    if (!rowData || rowData.length !== n || !Number.isFinite(limits[row])) {
      return null;
    }
    if (limits[row] < 0) return null;
    for (let col = 0; col < n; col += 1) {
      if (!Number.isFinite(rowData[col])) return null;
    }
  }
  if (n === 0) return [];

  const width = n + m + 1;
  const height = m + 1;
  const t = Array.from({ length: height }, () => Array(width).fill(0));
  const basis = Array.from({ length: m }, (_, i) => n + i);

  for (let row = 0; row < m; row += 1) {
    const rowData = matrix[row];
    let rowScale = Math.abs(limits[row]);
    for (let col = 0; col < n; col += 1) {
      const coefficient = Math.abs(rowData[col]);
      if (coefficient > rowScale) rowScale = coefficient;
    }
    if (!Number.isFinite(rowScale)) return null;
    if (rowScale === 0) {
      t[row][n + row] = 1;
      continue;
    }
    for (let col = 0; col < n; col += 1) {
      t[row][col] = matrix[row][col] / rowScale;
    }
    t[row][n + row] = 1;
      t[row][width - 1] = limits[row] / rowScale;
  }
  let objectiveScale = 0;
  for (let col = 0; col < n; col += 1) {
    const value = objective[col];
    if (!Number.isFinite(value)) return null;
    const absolute = Math.abs(value);
    if (absolute > objectiveScale) objectiveScale = absolute;
  }
  for (let col = 0; col < n; col += 1) {
    t[m][col] = objectiveScale === 0 ? 0 : -objective[col] / objectiveScale;
  }

  for (let iteration = 0; iteration < 2000; iteration += 1) {
    let enter = -1;
    for (let col = 0; col < width - 1; col += 1) {
      if (t[m][col] < -SIMPLEX_EPSILON) {
        enter = col;
        break;
      }
    }
    if (enter < 0) {
      const answer = Array(n).fill(0);
      basis.forEach((variable, row) => {
        if (variable < n) answer[variable] = Math.max(0, t[row][width - 1]);
      });
      return answer;
    }

    let leave = -1;
    let ratio = Number.POSITIVE_INFINITY;
    for (let row = 0; row < m; row += 1) {
      if (t[row][enter] <= SIMPLEX_EPSILON) continue;
      const candidate = t[row][width - 1] / t[row][enter];
      const ratioTolerance =
        Number.EPSILON *
        16 *
        Math.max(
          Number.MIN_VALUE,
          Math.abs(candidate),
          Number.isFinite(ratio) ? Math.abs(ratio) : 0,
        );
      if (
        candidate < ratio - ratioTolerance ||
        (Math.abs(candidate - ratio) <= ratioTolerance &&
          (leave < 0 || basis[row] < basis[leave]))
      ) {
        leave = row;
        ratio = candidate;
      }
    }
    if (leave < 0) return null;

    const pivot = t[leave][enter];
    for (let col = 0; col < width; col += 1) t[leave][col] /= pivot;
    for (let row = 0; row < height; row += 1) {
      if (row === leave || Math.abs(t[row][enter]) <= SIMPLEX_EPSILON) {
        continue;
      }
      const factor = t[row][enter];
      for (let col = 0; col < width; col += 1) {
        t[row][col] -= factor * t[leave][col];
      }
    }
    const leaving = basis[leave];
    basis[leave] = enter;
    onStep?.({ iteration: iteration + 1, entering: enter, leaving, objective: t[m][width - 1] * objectiveScale });
  }
  return null;
}

