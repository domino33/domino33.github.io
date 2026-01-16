function CascadeDDL(parentDDL, childDDL, actionName) {
    var selectedParent = $(parentDDL).val();
    $.getJSON(actionName, { filterId: selectedParent }, function (child) {
            var selectedChild = $(childDDL);
            selectedChild.empty();
            $.each(child, function (index, child) {

                selectedChild.append($('<option/>', {
                    value: child.Value,
                    text: child.Text
                }));
            });
        });
}