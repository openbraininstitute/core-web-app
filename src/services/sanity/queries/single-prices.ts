const singlePricesQuery = `*[_type == "singlePrice"][] {
  itemName,
  freePrice,
  proPrice,
  costUnit,
  section,
  customCostUnit
}`;

export default singlePricesQuery;
