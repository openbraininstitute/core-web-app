const formatNumberWithComma = (num: number) => {
  const formattedValue = new Intl.NumberFormat('en-US').format(num);

  return formattedValue;
};

export default formatNumberWithComma;
