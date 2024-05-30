$("#menu-toggle").on('click', function(){
    $(".dropdown-menu").toggleClass("hidden");
});

$(".menu-unit").on('click', function(){
    if($(this).is("#fp")){
        $("#floor-plans").toggleClass("hidden");
    };
    if($(this).is("#f")){
        $("#furnitures").toggleClass("hidden");
    };
});

$(".menu-header").on('click', function(e){
    $(this).next().toggleClass("hidden");
    e.stopPropagation();
});
