const aboutQuery = `*[_type=="ResourceHelpSection"][0]{
  aboutContent,
  aboutTheAppContent,
  termsAndConditionContent
}`;

export default aboutQuery;
