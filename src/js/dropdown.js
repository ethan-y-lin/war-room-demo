//need to refresh the menu when hidden later
$("#menu-toggle").on('click', function(){
    $(".dropdown-menu").toggleClass("hidden");
});

//ideally should use hover to determine hidden class but then it can't go to the next layer
//will take a look at this later
$(".menu-unit").on('click', function(){
    if($(this).is("#fp")){
        $("#floor-plans").removeClass("hidden");
        $("#furnitures, #saved-plans").addClass("hidden");
    };
    if($(this).is("#f")){
        $("#furnitures").toggleClass("hidden");
        $("#floor-plans, #saved-plans").addClass("hidden");
    };
    if($(this).is("#m")){
        $("#floor-plans, #furnitures, #saved-plans").addClass("hidden");
    };
    if($(this).is("#sp")){
        $("#saved-plans").removeClass("hidden");
        $("#floor-plans, #furnitures").addClass("hidden");
    };
    if($(this).is("#p3")){
        $("#floor-plans, #furnitures, #saved-plans").addClass("hidden");
    };
});

$(".menu-header").on('click', function(e){
    $(this).next().toggleClass("hidden");
    e.stopPropagation();
});
