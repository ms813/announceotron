$(document).ready(() => {
    let snd;
    $('.theme').click(e => {
        if (snd) {
            snd.pause();
        }

        let url = $(e.target).data('url');
        snd = new Audio(url);
        snd.play();
    });
});