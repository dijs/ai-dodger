var ghpages = require('gh-pages');
 
ghpages.publish('public', function(err) {
  if (err) {
    return console.log(err);
  }
  console.log('Published Successfully!');
});