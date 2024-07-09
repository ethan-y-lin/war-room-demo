import $ from 'jquery';
const steps = $(".step");

function nextStep(){
    let nextNum = steps.index($(".step:not(.hidden)"))+1+1;
    if(nextNum > steps.length){
        nextNum = 1;
    }
    showSlide(nextNum);
}

function prevStep(){
    let prevNum = steps.index($(".step:not(.hidden)"))-1+1;
    if(prevNum <=0){
        prevNum = steps.length;
    }
    showSlide(prevNum);
}

function showSlide(num){
    let index = num - 1;
    let currentStep = steps.eq(index);
    steps.addClass("hidden");
    currentStep.removeClass("hidden");
}
$(document).ready(function(){
    $("#step1").removeClass("hidden");
})
$("#prev").on('click', function(){
    prevStep();
})
$("#next").on('click', function(){
    nextStep();
})

$("#dot1").on('click', function(){
    steps.addClass("hidden");
    $("#step1").removeClass("hidden");
})
$("#dot2").on('click', function(){
    steps.addClass("hidden");
    $("#step2").removeClass("hidden");
})
$("#dot3").on('click', function(){
    steps.addClass("hidden");
    $("#step3").removeClass("hidden");
})
$("#dot4").on('click', function(){
    steps.addClass("hidden");
    $("#step4").removeClass("hidden");
})
$("#dot5").on('click', function(){
    steps.addClass("hidden");
    $("#step5").removeClass("hidden");
})
$("#dot6").on('click', function(){
    steps.addClass("hidden");
    $("#step6").removeClass("hidden");
})
$("#dot7").on('click', function(){
    steps.addClass("hidden");
    $("#step7").removeClass("hidden");
})
