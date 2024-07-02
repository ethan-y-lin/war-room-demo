import $ from 'jquery';

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
    if($(this).is("#list")){
        $(".layer3").addClass("hidden");
        $("#list3").removeClass("hidden");
    } else {
        $(".layer3").addClass("hidden");
        $("#category-" + this.id).removeClass("hidden");
        $("#list3").addClass("hidden");
    }
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

$("#category-button").on('click', function(){
    $("#category-form").slideToggle("slow");
})

$("#room-button").on('click', function(){
    $("#room-form").slideToggle("slow");
})

$(".object-button").on('click', function(){
    console.log("object-button clicked");
    $("#object-form").slideToggle("slow");
})

//tooltips click and hover
$(".tooltip-icon").on('mouseenter',function(){
    $(this).next(".tooltip-text").toggleClass("hidden");
})
$(".tooltip-icon").on('mouseleave',function(){
    $(this).next(".tooltip-text").toggleClass("hidden");
})
$(".tooltip-icon-vertical").on('mouseenter',function(){
    $(this).next(".tooltip-text-vertical").toggleClass("hidden");
})
$(".tooltip-icon-vertical").on('mouseleave',function(){
    $(this).next(".tooltip-text-vertical").toggleClass("hidden");
})
$(".tutorial-button").on('click', function(){
    $(".tooltip-text, .tooltip-text-vertical").toggleClass("hidden");
})

$("#save-as").on('click', function(){
    $("#design-save-form").slideDown('slow');
})
$("#close-button").on('click', function(){
    $("#design-save-form").slideUp('slow');
})


