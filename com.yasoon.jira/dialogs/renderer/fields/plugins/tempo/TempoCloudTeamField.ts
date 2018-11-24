/// <reference path="../../../Field.ts" />
/// <reference path="../../JiraSelectField.ts" />
/// <reference path="../../../../../definitions/common.d.ts" />
/// <reference path="../../../../../definitions/bluebird.d.ts" />
/// <reference path="../../../getter/GetTextValue.ts" />
/// <reference path="../../../setter/SetOptionValue.ts" />

interface TempoTeam {
    id: number;
    name: string;
    summary?: string;
}

@getter(GetterType.Text)
@setter(SetterType.Option)
class TempoCloudTeamField extends JiraSelectField {


}