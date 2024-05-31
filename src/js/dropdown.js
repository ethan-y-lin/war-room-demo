//need to refresh the menu when hidden later
$("#menu-toggle").on('click', function(){
    $(".dropdown-menu").toggleClass("hidden");
});

//ideally should use hover to determine hidden class but then it can't go to the next layer
//will take a look at this later
$(".menu-unit").on('mouseover', function(){
    if($(this).is("#fp")){
        $("#floor-plans").removeClass("hidden");
        $("#furnitures, #placeholder1, #placeholder2, #placeholder3").addClass("hidden");
    };
    if($(this).is("#f")){
        $("#furnitures").toggleClass("hidden");
        $("#floor-plans, #placeholder1, #placeholder2, #placeholder3").addClass("hidden");
    };
    if($(this).is("#p1")){
        $("#placeholder1").toggleClass("hidden");
        $("#floor-plans, #furnitures, #placeholder2, #placeholder3").addClass("hidden");
    };
    if($(this).is("#p2")){
        $("#placeholder2").toggleClass("hidden");
        $("#floor-plans, #furnitures, #placeholder1, #placeholder3").addClass("hidden");
    };
    if($(this).is("#p3")){
        $("#placeholder3").toggleClass("hidden");
        $("#floor-plans, #furnitures, #placeholder1, #placeholder2").addClass("hidden");
    };
});

//can't hide if mouseleave on layer1 now
//don't wanna do that cuz then it can't go to the next layer
$(".layer2").on('mouseleave', function(){
    $(".layer2").addClass("hidden");
});

$(".menu-header").on('click', function(e){
    $(this).next().toggleClass("hidden");
    e.stopPropagation();
});
