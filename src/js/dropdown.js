const menuHeader = document.querySelector('.menu-header');
const menuContainer = document.querySelector('.menu-container');


menuHeader.addEventListener('click', function(){
    menuContainer.classList.toggle('active');
});
