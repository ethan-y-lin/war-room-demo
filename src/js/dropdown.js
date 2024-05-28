var menuHeader = document.querySelector('.menu');
var menuContainer = document.querySelector('.menu-container');

menuHeader.addEventListener('click', function(){
    menuContainer.classList.toggle('active');
});

