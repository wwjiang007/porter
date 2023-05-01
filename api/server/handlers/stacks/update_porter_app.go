package stacks

import (
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/server/shared/requestutils"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/models"
)

type UpdatePorterAppHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewUpdatePorterAppHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *UpdatePorterAppHandler {
	return &UpdatePorterAppHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
	}
}

func (c *UpdatePorterAppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	cluster, _ := ctx.Value(types.ClusterScope).(*models.Cluster)

	name, _ := requestutils.GetURLParamString(r, types.URLParamReleaseName)

	porterApp, err := c.Repo().PorterApp().ReadPorterAppByName(cluster.ID, name)
	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.UpdatePorterAppRequest{}
	ok := c.DecodeAndValidate(w, r, request)
	if !ok {
		return
	}

	if request.RepoName != "" {
		porterApp.RepoName = request.RepoName
	}
	if request.GitBranch != "" {
		porterApp.GitBranch = request.GitBranch
	}
	if request.BuildContext != "" {
		porterApp.BuildContext = request.BuildContext
	}
	if request.Builder != "" {
		porterApp.Builder = request.Builder
	}
	if request.Buildpacks != "" {
		porterApp.Buildpacks = request.Buildpacks
	}
	if request.Dockerfile != "" {
		porterApp.Dockerfile = request.Dockerfile
	}
	if request.ImageRepoURI != "" {
		porterApp.ImageRepoURI = request.ImageRepoURI
	}

	updatedPorterApp, err := c.Repo().PorterApp().UpdatePorterApp(porterApp)
	if err != nil {
		return
	}

	c.WriteResult(w, r, updatedPorterApp.ToPorterAppType())
}
