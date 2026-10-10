# Attribution and build facts

Application implementation began on 8 October 2026 in this workspace at the team's explicit instruction. Exact organizer kickoff confirmation remains unverified; no eligibility assurance is made.

AI coding tool used: OpenAI Codex. Earlier files in the parent workspace are planning/PDF artifacts, not reused application code.

Dependencies include Google OR-Tools (Apache-2.0), Pydantic (MIT), pytest (MIT), Ruff (MIT), TypeScript (Apache-2.0). Dependency versions are recorded in lockfiles. Verify notices for added dependencies before publication.

`infra/bootstrap-template.json` derives from AWS CDK CLI 2.1145.0's official bootstrap template (Amazon Web Services, Apache-2.0), modified on 10 October 2026 to narrow deployment permissions, remove external trust and select AWS-managed encryption. Source: https://github.com/aws/aws-cdk-cli ; the upstream license is included as `infra/bootstrap-LICENSE.txt`. This does not select the application's project license.

The team's own project license has not been selected. The owner authorized publishing https://github.com/singh-himanshu3/jalsetu on 10 October 2026. No cloud deployment is claimed.

The normal example's resources and route matrices are synthetic test scenarios, not NGO/government inventory or observed traffic. The separate public-road experiment contains one actual OSRM/OpenStreetMap matrix response; © OpenStreetMap contributors, road data under ODbL, routing by OSRM hosted by FOSSGIS. See `data/public-roads/README.md` for attribution, licence and source-policy links. Operational inputs in that experiment remain synthetic. No public weather or population data were collected. This data notice does not choose the application project's licence.

## Leaflet 1.9.4

BSD 2-Clause License

Copyright (c) 2010-2023, Volodymyr Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Driver-view base-map tiles are served by OpenStreetMap, with visible attribution to OpenStreetMap contributors. See https://operations.osmfoundation.org/policies/tiles/ and https://www.openstreetmap.org/copyright . Google Maps links open the external service and do not use a paid Maps API.

## Frontend animation, icons and typography

Motion for React (MIT), Lucide React (ISC), and locally bundled DM Sans / DM Serif Display fonts (SIL Open Font License 1.1) are used. Upstream license text is retained under `docs/licenses/`. These dependencies do not choose the project's license. Font files are bundled with the frontend; no runtime Google Fonts request is required. The introductory map is an original SVG illustration, explicitly labelled schematic. No reference-site assets or branding were copied.
