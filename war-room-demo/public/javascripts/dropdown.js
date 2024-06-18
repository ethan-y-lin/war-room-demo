$("#column1").removeClass("hidden");
//need to refresh the menu when hidden later
$("#menu-toggle").on('click', function(){
    $(".dropdown-menu").toggleClass("hidden");
});

//ideally should use hover to determine hidden class but then it can't go to the next layer
//will take a look at this later
$(".menu-unit").on('click', function(){
    if($(this).is("#fp")){
        $("#floor-plans").removeClass("hidden");
        $("#column1, #furnitures, #saved-plans").addClass("hidden");
    };
    if($(this).is("#f")){
        $("#furnitures").removeClass("hidden");
        $("#column1, #floor-plans, #saved-plans").addClass("hidden");
    };
    if($(this).is("#m")){
        $("#floor-plans, #furnitures, #saved-plans").addClass("hidden");
    };
    if($(this).is("#sp")){
        $("#saved-plans").removeClass("hidden");
        $("#column1, #floor-plans, #furnitures").addClass("hidden");
    };
    if($(this).is("#p3")){
        $("#floor-plans, #furnitures, #saved-plans").addClass("hidden");
    };
});

$(".menu-header").on('click', function(){
    $(".layer2").addClass("hidden");
    $("#column3").removeClass("hidden");
    
    if($(this).is("#Chair")){
        $("#category-Chair").removeClass("hidden");
        // $("#sofas3, #tables3").addClass("hidden");
        $("#list3").addClass("hidden");
    }
    if($(this).is("#list")){
        $("#list3").removeClass("hidden");
        $("#category-Chair").addClass("hidden");
    }
    // if($(this).is("#sofas")){
    //     $("#sofas3").removeClass("hidden");
    //     $("#chairs3, #tables3").addClass("hidden");
    // }
    // if($(this).is("#tables")){
    //     $("#tables3").removeClass("hidden");
    //     $("#chairs3, #sofas3").addClass("hidden");
    // }

});

$(".back-button1").on('click', function(){
    $(".layer2").addClass("hidden");
    $("#column1").removeClass("hidden");
})
//temporary solution
$(".back-button2").on('click', function(){
    $("#column3").addClass("hidden");
    $("#furnitures").removeClass("hidden");
})

//temporary refresh the whole page
$("#reset").on('click', function(){
    history.go(0);
})

$("#category-button").on('click', function(){
    $("#category-form").slideToggle("slow");
})
