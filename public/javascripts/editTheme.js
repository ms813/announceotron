$(document).ready(() => {
    $('.weight').click(e => {
        let input = $(e.target).attr('contentEditable', true);
        let default_weight = input.text();

        input.blur(b => {

            if($(b.target) == input){
                return false;
            }
            input.attr('contentEditable', false);
            let weight = input.text();
            if(isNaN(weight)){
                input.text(default_weight);
                return false;
            }

            input.off('blur');

            let guildId = input.closest('table').data('guildid');
            let userId = input.data('userid');
            let themePath = input.data('theme');
            let url = guildId + "/" + userId + "/" + themePath + "/update_weight/" + weight;
            let req = $.post(url, weight);
            req.done((data, err, jqXHR) => {
                console.log("Weight updated successfully");
            });

            req.fail((data, err, jqXHR) => console.log(`Error updating weight: ${err}`));
        });
    });


});