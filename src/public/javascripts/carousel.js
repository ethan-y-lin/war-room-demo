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