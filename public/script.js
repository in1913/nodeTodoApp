$('.delete').click(function (e){
    $.ajax({
        method: 'delete',
        url : '/delete',
        data : {_id : e.target.dataset.id}
    }).done(function (result){
        // window.location.reload();
        $(this).parent('li').fadeOut();
    }).fail(function(xhr, textStatus, errorThrown){
        console.log(xhr, textStatus, errorThrown);
    });
});

$('#search').click(function (){
    const value = $('#search-input').val();
    window.location.replace('/search?value=' + value);

    const data = {name1 : 'value1', name2 : 'value2'}
    $.params(data);

    $('form').serialize();
})

