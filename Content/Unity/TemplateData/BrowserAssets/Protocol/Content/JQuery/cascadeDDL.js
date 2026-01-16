function CascadeDDL(parentDDL, childDDL, actionName, conteiner, isFilter, action) {
    var selectedParent = $(parentDDL).val();
    //actionName = actionName.split('?')[0];
    $.getJSON(actionName, { filterId: selectedParent, isFilter: isFilter }, function (child) {
            var selectedChild = $(childDDL);
            var isElements = false;
            selectedChild.empty();
            $.each(child, function (index, child) {
                isElements = true;
                selectedChild.append($('<option/>', {
                    value: child.Value,
                    text: child.Text
                }));
            });
            if(conteiner != null)
            {
                if(!isElements)
                {
                    conteiner.hide();
                } else
                {
                    conteiner.show();
                }
            } 
            if (action)
                action();
    }).fail(function( jqxhr, textStatus, error ) {
        var err = textStatus + ", " + error;
        alert(err);
    });
}