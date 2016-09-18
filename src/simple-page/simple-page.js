console.log('test');

if (!$) {
  throw new Error('Missing jQuery');
}

$(document).ready(() => {
  console.log('ready');
  $('#content-main').append('<div>test</div>');
});
