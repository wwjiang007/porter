package release

import (
	"fmt"
	"net/http"

	"github.com/porter-dev/porter/api/server/authz"
	"github.com/porter-dev/porter/api/server/handlers"
	"github.com/porter-dev/porter/api/server/shared"
	"github.com/porter-dev/porter/api/server/shared/apierrors"
	"github.com/porter-dev/porter/api/server/shared/config"
	"github.com/porter-dev/porter/api/types"
	"github.com/porter-dev/porter/internal/helm"
	"github.com/porter-dev/porter/internal/helm/loader"
	"github.com/porter-dev/porter/internal/models"
)

type CreateAddonHandler struct {
	handlers.PorterHandlerReadWriter
	authz.KubernetesAgentGetter
}

func NewCreateAddonHandler(
	config *config.Config,
	decoderValidator shared.RequestDecoderValidator,
	writer shared.ResultWriter,
) *CreateAddonHandler {
	return &CreateAddonHandler{
		PorterHandlerReadWriter: handlers.NewDefaultPorterHandler(config, decoderValidator, writer),
		KubernetesAgentGetter:   authz.NewOutOfClusterAgentGetter(config),
	}
}

func (c *CreateAddonHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	cluster, _ := r.Context().Value(types.ClusterScope).(*models.Cluster)
	namespace := r.Context().Value(types.NamespaceScope).(string)

	helmAgent, err := c.GetHelmAgent(r, cluster)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	request := &types.CreateAddonRequest{}

	if ok := c.DecodeAndValidate(w, r, request); !ok {
		return
	}

	chart, err := loader.LoadChartPublic(request.RepoURL, request.TemplateName, request.TemplateVersion)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	registries, err := c.Repo().Registry().ListRegistriesByProjectID(cluster.ProjectID)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrInternal(err))
		return
	}

	conf := &helm.InstallChartConfig{
		Chart:      chart,
		Name:       request.Name,
		Namespace:  namespace,
		Values:     request.Values,
		Cluster:    cluster,
		Repo:       c.Repo(),
		Registries: registries,
	}

	_, err = helmAgent.InstallChart(conf, c.Config().DOConf)

	if err != nil {
		c.HandleAPIError(w, r, apierrors.NewErrPassThroughToClient(
			fmt.Errorf("error installing a new chart: %s", err.Error()),
			http.StatusBadRequest,
		))

		return
	}
}
