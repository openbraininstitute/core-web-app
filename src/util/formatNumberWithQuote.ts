const formatNumberWithQuote = (number: string | number): string => {
    const numStr = number.toString();
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  }

export default formatNumberWithQuote;