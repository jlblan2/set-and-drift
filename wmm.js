'use strict';
/*
 * World Magnetic Model (WMM2025), epoch 2025.0, valid 2025.0-2030.0.
 * Coefficients: NOAA/NCEI WMM2025COF (public domain). Algorithm is a direct
 * port of NOAA's reference spherical-harmonic model (the legacy WMM C code),
 * verified against NOAA's published test point:
 *   glat=47.6205 glon=-122.3493 alt=0 time=2025.25 -> declination 15.0656...
 */
const WMM = (function () {
  const EPOCH = 2025.0;
  const MAXORD = 12;
  const SIZE = MAXORD + 1;

  // [n, m, gnm, hnm, dgnm, dhnm]
  const COEFFS = [
    [1,0,-29351.8,0.0,12.0,0.0],
    [1,1,-1410.8,4545.4,9.7,-21.5],
    [2,0,-2556.6,0.0,-11.6,0.0],
    [2,1,2951.1,-3133.6,-5.2,-27.7],
    [2,2,1649.3,-815.1,-8.0,-12.1],
    [3,0,1361.0,0.0,-1.3,0.0],
    [3,1,-2404.1,-56.6,-4.2,4.0],
    [3,2,1243.8,237.5,0.4,-0.3],
    [3,3,453.6,-549.5,-15.6,-4.1],
    [4,0,895.0,0.0,-1.6,0.0],
    [4,1,799.5,278.6,-2.4,-1.1],
    [4,2,55.7,-133.9,-6.0,4.1],
    [4,3,-281.1,212.0,5.6,1.6],
    [4,4,12.1,-375.6,-7.0,-4.4],
    [5,0,-233.2,0.0,0.6,0.0],
    [5,1,368.9,45.4,1.4,-0.5],
    [5,2,187.2,220.2,0.0,2.2],
    [5,3,-138.7,-122.9,0.6,0.4],
    [5,4,-142.0,43.0,2.2,1.7],
    [5,5,20.9,106.1,0.9,1.9],
    [6,0,64.4,0.0,-0.2,0.0],
    [6,1,63.8,-18.4,-0.4,0.3],
    [6,2,76.9,16.8,0.9,-1.6],
    [6,3,-115.7,48.8,1.2,-0.4],
    [6,4,-40.9,-59.8,-0.9,0.9],
    [6,5,14.9,10.9,0.3,0.7],
    [6,6,-60.7,72.7,0.9,0.9],
    [7,0,79.5,0.0,-0.0,0.0],
    [7,1,-77.0,-48.9,-0.1,0.6],
    [7,2,-8.8,-14.4,-0.1,0.5],
    [7,3,59.3,-1.0,0.5,-0.8],
    [7,4,15.8,23.4,-0.1,0.0],
    [7,5,2.5,-7.4,-0.8,-1.0],
    [7,6,-11.1,-25.1,-0.8,0.6],
    [7,7,14.2,-2.3,0.8,-0.2],
    [8,0,23.2,0.0,-0.1,0.0],
    [8,1,10.8,7.1,0.2,-0.2],
    [8,2,-17.5,-12.6,0.0,0.5],
    [8,3,2.0,11.4,0.5,-0.4],
    [8,4,-21.7,-9.7,-0.1,0.4],
    [8,5,16.9,12.7,0.3,-0.5],
    [8,6,15.0,0.7,0.2,-0.6],
    [8,7,-16.8,-5.2,-0.0,0.3],
    [8,8,0.9,3.9,0.2,0.2],
    [9,0,4.6,0.0,-0.0,0.0],
    [9,1,7.8,-24.8,-0.1,-0.3],
    [9,2,3.0,12.2,0.1,0.3],
    [9,3,-0.2,8.3,0.3,-0.3],
    [9,4,-2.5,-3.3,-0.3,0.3],
    [9,5,-13.1,-5.2,0.0,0.2],
    [9,6,2.4,7.2,0.3,-0.1],
    [9,7,8.6,-0.6,-0.1,-0.2],
    [9,8,-8.7,0.8,0.1,0.4],
    [9,9,-12.9,10.0,-0.1,0.1],
    [10,0,-1.3,0.0,0.1,0.0],
    [10,1,-6.4,3.3,0.0,0.0],
    [10,2,0.2,0.0,0.1,-0.0],
    [10,3,2.0,2.4,0.1,-0.2],
    [10,4,-1.0,5.3,-0.0,0.1],
    [10,5,-0.6,-9.1,-0.3,-0.1],
    [10,6,-0.9,0.4,0.0,0.1],
    [10,7,1.5,-4.2,-0.1,0.0],
    [10,8,0.9,-3.8,-0.1,-0.1],
    [10,9,-2.7,0.9,-0.0,0.2],
    [10,10,-3.9,-9.1,-0.0,-0.0],
    [11,0,2.9,0.0,0.0,0.0],
    [11,1,-1.5,0.0,-0.0,-0.0],
    [11,2,-2.5,2.9,0.0,0.1],
    [11,3,2.4,-0.6,0.0,-0.0],
    [11,4,-0.6,0.2,0.0,0.1],
    [11,5,-0.1,0.5,-0.1,-0.0],
    [11,6,-0.6,-0.3,0.0,-0.0],
    [11,7,-0.1,-1.2,-0.0,0.1],
    [11,8,1.1,-1.7,-0.1,-0.0],
    [11,9,-1.0,-2.9,-0.1,0.0],
    [11,10,-0.2,-1.8,-0.1,0.0],
    [11,11,2.6,-2.3,-0.1,0.0],
    [12,0,-2.0,0.0,0.0,0.0],
    [12,1,-0.2,-1.3,0.0,-0.0],
    [12,2,0.3,0.7,-0.0,0.0],
    [12,3,1.2,1.0,-0.0,-0.1],
    [12,4,-1.3,-1.4,-0.0,0.1],
    [12,5,0.6,-0.0,-0.0,-0.0],
    [12,6,0.6,0.6,0.1,-0.0],
    [12,7,0.5,-0.1,-0.0,-0.0],
    [12,8,-0.1,0.8,0.0,0.0],
    [12,9,-0.4,0.1,0.0,-0.0],
    [12,10,-0.2,-1.0,-0.1,-0.0],
    [12,11,-1.3,0.1,-0.0,0.0],
    [12,12,-0.7,0.2,-0.1,-0.1],
  ];

  function createMatrix(rows, cols) {
    return Array.from({ length: rows }, () => new Array(cols).fill(0));
  }

  let C, CD, P, FN, FM, K, loaded = false;

  function loadCoefficients() {
    if (loaded) return;
    C = createMatrix(SIZE, SIZE);
    CD = createMatrix(SIZE, SIZE);
    P = new Array(SIZE * SIZE).fill(0);
    FN = new Array(SIZE).fill(0);
    FM = new Array(SIZE).fill(0);
    K = createMatrix(SIZE, SIZE);

    for (const [n, m, gnm, hnm, dgnm, dhnm] of COEFFS) {
      if (m > n || m < 0) throw new Error('Corrupt WMM coefficient record');
      C[m][n] = gnm;
      CD[m][n] = dgnm;
      if (m !== 0) {
        C[n][m - 1] = hnm;
        CD[n][m - 1] = dhnm;
      }
    }

    // Convert Schmidt semi-normalized Gauss coefficients to unnormalized.
    P[0] = 1.0;
    FM[0] = 0.0;
    for (let n = 1; n <= MAXORD; n++) {
      P[n] = P[n - 1] * (2 * n - 1) / n;
      let j = 2;
      let m = 0;
      let remaining = n - m + 1;
      while (remaining > 0) {
        K[m][n] = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
        if (m > 0) {
          const flnmj = ((n - m + 1) * j) / (n + m);
          P[n + m * SIZE] = P[n + (m - 1) * SIZE] * Math.sqrt(flnmj);
          j = 1;
          C[n][m - 1] = P[n + m * SIZE] * C[n][m - 1];
          CD[n][m - 1] = P[n + m * SIZE] * CD[n][m - 1];
        }
        C[m][n] = P[n + m * SIZE] * C[m][n];
        CD[m][n] = P[n + m * SIZE] * CD[m][n];
        remaining -= 1;
        m += 1;
      }
      FN[n] = n + 1;
      FM[n] = n;
    }
    K[1][1] = 0.0;
    loaded = true;
  }

  // Returns geomagnetic declination in degrees (East positive, West negative).
  // glat/glon in degrees, altKm in km above the WGS84 ellipsoid (sea level ~= 0),
  // decimalYear e.g. 2026.68 for early Sept 2026.
  function declination(glat, glon, altKm, decimalYear) {
    loadCoefficients();
    const dt = decimalYear - EPOCH;

    const a = 6378.137, b = 6356.7523142, re = 6371.2;
    const a2 = a * a, b2 = b * b, c2 = a2 - b2, a4 = a2 * a2, b4 = b2 * b2, c4 = a4 - b4;

    const rlon = glon * Math.PI / 180;
    const rlat = glat * Math.PI / 180;
    const srlon = Math.sin(rlon), crlon = Math.cos(rlon);
    const srlat = Math.sin(rlat), crlat = Math.cos(rlat);
    const srlat2 = srlat * srlat, crlat2 = crlat * crlat;

    const sp = new Array(SIZE).fill(0);
    const cp = new Array(SIZE).fill(1);
    const pp = new Array(SIZE).fill(1);
    const dp = createMatrix(SIZE, SIZE);
    const tc = createMatrix(SIZE, SIZE);

    sp[0] = 0.0;
    sp[1] = srlon;
    cp[1] = crlon;

    const q = Math.sqrt(a2 - c2 * srlat2);
    const q1 = altKm * q;
    const q2 = ((q1 + a2) / (q1 + b2)) * ((q1 + a2) / (q1 + b2));
    const ct = srlat / Math.sqrt(q2 * crlat2 + srlat2);
    const st = Math.sqrt(1.0 - ct * ct);
    const r2 = altKm * altKm + 2.0 * q1 + (a4 - c4 * srlat2) / (q * q);
    const r = Math.sqrt(r2);
    const dd = Math.sqrt(a2 * crlat2 + b2 * srlat2);
    const ca = (altKm + dd) / r;
    const sa = c2 * crlat * srlat / (r * dd);

    for (let m = 2; m <= MAXORD; m++) {
      sp[m] = sp[1] * cp[m - 1] + cp[1] * sp[m - 1];
      cp[m] = cp[1] * cp[m - 1] - sp[1] * sp[m - 1];
    }

    const aor = re / r;
    let ar = aor * aor;
    let br = 0, bt = 0, bp = 0, bpp = 0;

    for (let n = 1; n <= MAXORD; n++) {
      ar *= aor;
      for (let m = 0; m <= n; m++) {
        if (n === m) {
          P[n + m * SIZE] = st * P[(n - 1) + (m - 1) * SIZE];
          dp[m][n] = st * dp[m - 1][n - 1] + ct * P[(n - 1) + (m - 1) * SIZE];
        } else if (n === 1 && m === 0) {
          P[n + m * SIZE] = ct * P[(n - 1) + m * SIZE];
          dp[m][n] = ct * dp[m][n - 1] - st * P[(n - 1) + m * SIZE];
        } else if (n > 1 && n !== m) {
          if (m > n - 2) {
            P[(n - 2) + m * SIZE] = 0.0;
            dp[m][n - 2] = 0.0;
          }
          P[n + m * SIZE] = ct * P[(n - 1) + m * SIZE] - K[m][n] * P[(n - 2) + m * SIZE];
          dp[m][n] = ct * dp[m][n - 1] - st * P[(n - 1) + m * SIZE] - K[m][n] * dp[m][n - 2];
        }

        tc[m][n] = C[m][n] + dt * CD[m][n];
        if (m !== 0) tc[n][m - 1] = C[n][m - 1] + dt * CD[n][m - 1];

        const par = ar * P[n + m * SIZE];
        let temp1, temp2;
        if (m === 0) {
          temp1 = tc[m][n] * cp[m];
          temp2 = tc[m][n] * sp[m];
        } else {
          temp1 = tc[m][n] * cp[m] + tc[n][m - 1] * sp[m];
          temp2 = tc[m][n] * sp[m] - tc[n][m - 1] * cp[m];
        }
        bt -= ar * temp1 * dp[m][n];
        bp += FM[m] * temp2 * par;
        br += FN[n] * temp1 * par;

        if (st === 0.0 && m === 1) {
          if (n === 1) pp[n] = pp[n - 1];
          else pp[n] = ct * pp[n - 1] - K[m][n] * pp[n - 2];
          const parp = ar * pp[n];
          bpp += FM[m] * temp2 * parp;
        }
      }
    }

    if (st === 0.0) bp = bpp; else bp /= st;

    const bx = -bt * ca - br * sa;
    const by = bp;

    return Math.atan2(by, bx) * 180 / Math.PI;
  }

  function toDecimalYear(ms) {
    const date = new Date(ms);
    const year = date.getUTCFullYear();
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    return year + (ms - start) / (end - start);
  }

  return { declination, toDecimalYear, EPOCH, VALID_FROM: EPOCH, VALID_TO: EPOCH + 5 };
})();
