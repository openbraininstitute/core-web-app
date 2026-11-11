const creditsQuery = `*[_type == "credits"][] {
  quantity,
  price,
  discount,
  pricePerCredit
}`;

export default creditsQuery;
