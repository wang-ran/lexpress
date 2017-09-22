module.exports = function (hubMac) {
  // C1000
  // 第一批次从 CC:1B:E0:E0:00:00 - CC:1B:E0:E0:51:3C
  // 第二批次：CC:1B:E0:E0:51:40 - CC:1B:E0:E0:A7:2C

  // S1000
  // CC:1B:E0:E0:A9:C8 - CC:1B:E0:E0:C2:C4
  // S1100
  // CC:1B:E0:E0:C2:C8 - CC:1B:E0:E0:DB:C4
  const lastFourArr = hubMac.slice(-5).split(':').map(item => parseInt(item, 16));
  const C1000 = 'C1000';
  const S1000 = 'S1000';
  const S1100 = 'S1100';
  const ERROR = 'S1000';
  if (lastFourArr[0] < '0xa7') {
    if (lastFourArr[0] === '0x51') {
      if (lastFourArr[1] <= '0x3c' || lastFourArr[1] >= '0x40') {
        return C1000;
      } else {
        return 'error';
      }
    }
    return C1000;
  } else if (lastFourArr[0] === '0xa7' && lastFourArr[1] <= '0x2c') {
    return C1000;
  } else if (lastFourArr[0] === '0xa9' && lastFourArr[1] >= '0xc8') {
    return S1000;
  } else if (lastFourArr[0] >= '0xaa' && lastFourArr[0] < '0xdb') {
    if (lastFourArr[0] === '0xc2') {
      if (lastFourArr[1] <= '0xc4') {
        return S1000;
      } else if (lastFourArr[1] >= '0xc8') {
        return S1100;
      } else {
        return ERROR;
      }
    } else if (lastFourArr[0] < '0xc2') {
      return S1000;
    } else if (lastFourArr[0] > '0xc2') {
      return S1100;
    }
  } else if (lastFourArr[0] === '0xdb' && lastFourArr[1] <= '0xc4') {
    return S1100;
  } else {
    return ERROR;
  }
};
